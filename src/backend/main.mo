import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Setup authorization system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Management
  type User = {
    createdAt : Time.Time;
    onboardingCompleted : Bool;
  };

  let userProfiles = Map.empty<Principal, User>();

  public shared ({ caller }) func completeOnboarding() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can complete onboarding");
    };

    let currentTime = Time.now();
    let existingUser = userProfiles.get(caller);

    let updatedUser : User = switch (existingUser) {
      case (null) { { createdAt = currentTime; onboardingCompleted = true } };
      case (?user) { { user with onboardingCompleted = true } };
    };

    userProfiles.add(caller, updatedUser);
  };

  public query ({ caller }) func canAccessOnboarding() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return false;
    };

    switch (userProfiles.get(caller)) {
      case (null) { true };
      case (?user) { not user.onboardingCompleted };
    };
  };
};
