import Principal "mo:core/Principal";
import Time "mo:core/Time";
import List "mo:core/List";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Nat8 "mo:core/Nat8";
import Array "mo:core/Array";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";



actor {
  // CHOCOLATE REWARD SYSTEM
  public type RewardType = {
    #tinyChocolate; // daily reward
    #chocolateBar; // weekly reward
    #chocolateSlab; // big goal reward
  };

  public type RewardEntry = {
    timestamp : Time.Time;
    rewardType : RewardType;
  };

  public type InventorySummary = {
    tinyChocolateCount : Nat;
    chocolateBarCount : Nat;
    chocolateSlabCount : Nat;
  };

  public type TimeRange = {
    #week;
    #month;
    #all;
  };

  // Reward state mapped by principal
  let rewardHistory = Map.empty<Principal, List.List<RewardEntry>>();
  let rewardCache = Map.empty<Principal, InventorySummary>();

  func filterRewardsByTimeRange(rewards : [RewardEntry], range : TimeRange) : [RewardEntry] {
    let now = Time.now();
    let rangeStart = switch (range) {
      case (#week) { now - 7 * 24 * 60 * 60 * 1_000_000_000 };
      case (#month) { now - 30 * 24 * 60 * 60 * 1_000_000_000 };
      case (#all) { 0 };
    };

    rewards.filter(
      func(reward) {
        reward.timestamp >= rangeStart;
      }
    );
  };

  func calculateInventory(rewards : [RewardEntry], range : TimeRange) : InventorySummary {
    var tinyChocolateCount : Nat = 0;
    var chocolateBarCount : Nat = 0;
    var chocolateSlabCount : Nat = 0;

    for (reward in rewards.values()) {
      switch (range) {
        // Only keep counting based on the active time range
        case (#week or #month) {
          if (reward.timestamp >= Time.now() - 30 * 24 * 60 * 60 * 1_000_000_000) {
            switch (reward.rewardType) {
              case (#tinyChocolate) { tinyChocolateCount += 1 };
              case (#chocolateBar) { chocolateBarCount += 1 };
              case (#chocolateSlab) { chocolateSlabCount += 1 };
            };
          };
        };
        case (#all) {
          switch (reward.rewardType) {
            case (#tinyChocolate) { tinyChocolateCount += 1 };
            case (#chocolateBar) { chocolateBarCount += 1 };
            case (#chocolateSlab) { chocolateSlabCount += 1 };
          };
        };
      };
    };

    {
      tinyChocolateCount;
      chocolateBarCount;
      chocolateSlabCount;
    };
  };

  public query ({ caller }) func getRewardsForCaller(timeRange : TimeRange) : async InventorySummary {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap(
        "Unauthorized: Only users can view rewards"
      );
    };
    switch (rewardHistory.get(caller)) {
      case (null) { { tinyChocolateCount = 0; chocolateBarCount = 0; chocolateSlabCount = 0 } };
      case (?rewardsList) {
        let filtered = filterRewardsByTimeRange(
          rewardsList.toArray(),
          timeRange,
        );
        calculateInventory(filtered, timeRange);
      };
    };
  };

  public shared ({ caller }) func addReward(rewardType : RewardType) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap(
        "Unauthorized: Only users can add rewards"
      );
    };
    let rewardEntry = {
      timestamp = Time.now();
      rewardType;
    };

    let currentRewards = switch (rewardHistory.get(caller)) {
      case (null) { List.empty<RewardEntry>() };
      case (?rewards) { rewards };
    };

    currentRewards.add(rewardEntry);
    rewardHistory.add(caller, currentRewards);

    let allTimeSummary = calculateInventory(currentRewards.toArray(), #all);
    rewardCache.add(caller, allTimeSummary);
  };

  // AUTHORIZATION
  // Explicitly initialize the access control state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = {
    name : Text;
    createdAt : Time.Time;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap(
        "Unauthorized: Only users can save profiles"
      );
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap(
        "Unauthorized: Only users can view profiles"
      );
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    // Users can view their own profile, admins can view any profile
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap(
        "Unauthorized: Can only view your own profile or must be admin"
      );
    };
    userProfiles.get(user);
  };

  // Let's enable data deletion for users.
  public shared ({ caller }) func deleteCallerUserData() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap(
        "Unauthorized: Only users can delete their data"
      );
    };
    userProfiles.remove(caller);
  };

  public query ({ caller }) func ping() : async Bool {
    true;
  };
};
