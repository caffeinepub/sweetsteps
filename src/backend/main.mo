import Text "mo:core/Text";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import AltSignup "AltSignup";
import Migration "migration";
import Iter "mo:core/Iter";

// Apply migration function to actor with persistent state
(with migration = Migration.run)
actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  var rbacBootstrapped : Bool = false;

  public shared ({ caller }) func warmup() : async { caller : Principal; time : Time.Time } {
    {
      caller;
      time = Time.now();
    };
  };

  public shared ({ caller }) func bootstrapRBAC() : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can bootstrap RBAC");
    };
    rbacBootstrapped := true;
  };

  public query func getRBACStatus() : async {
    bootstrapped : Bool;
  } {
    {
      bootstrapped = rbacBootstrapped;
    };
  };

  public query func isRBACActive() : async Bool {
    rbacBootstrapped;
  };

  // User Profile Management
  type User = {
    createdAt : Time.Time;
    onboardingCompleted : Bool;
  };

  var userProfiles = Map.empty<Principal, User>();

  public shared ({ caller }) func completeOnboarding() : async () {
    if (rbacBootstrapped and not AccessControl.hasPermission(accessControlState, caller, #user)) {
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

  public shared ({ caller }) func restartOnboarding() : async () {
    if (rbacBootstrapped and not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can restart onboarding");
    };

    switch (userProfiles.get(caller)) {
      case (null) {
        Runtime.trap("No user profile found for caller. Please create a profile before restarting onboarding");
      };
      case (?user) {
        let updatedUser : User = { user with onboardingCompleted = false };
        userProfiles.add(caller, updatedUser);
      };
    };
  };

  public query ({ caller }) func canAccessOnboarding() : async Bool {
    if (rbacBootstrapped and not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can check onboarding access");
    };

    switch (userProfiles.get(caller)) {
      case (null) { true };
      case (?user) { not user.onboardingCompleted };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?User {
    if (rbacBootstrapped and not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view profiles");
    };

    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?User {
    if (
      rbacBootstrapped and caller != user and not AccessControl.isAdmin(accessControlState, caller)
    ) {
      Runtime.trap("Unauthorized: Can only view your own profile unless admin");
    };

    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : User) : async () {
    if (rbacBootstrapped and not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can save profiles");
    };

    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func alternateSignup(username : Text, password : Text) : async {
    success : Bool;
    message : Text;
  } {
    if (caller.isAnonymous()) {
      return {
        success = false;
        message = "Anonymous principals cannot sign up with username/password";
      };
    };

    if (rbacBootstrapped and AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Already registered users cannot sign up again");
    };

    if (username.size() < 3) {
      return {
        success = false;
        message = "Username must be at least 3 characters";
      };
    };

    if (password.size() < 8) {
      return {
        success = false;
        message = "Password must be at least 8 characters";
      };
    };

    switch (userProfiles.get(caller)) {
      case (?_existing) {
        return {
          success = false;
          message = "User already registered";
        };
      };
      case null {
        // Proceed with signup.
      };
    };

    let signupResult = AltSignup.handleSignup(username, password);

    if (signupResult.success) {
      let currentTime = Time.now();
      let newUser : User = {
        createdAt = currentTime;
        onboardingCompleted = false;
      };
      userProfiles.add(caller, newUser);
    };

    signupResult;
  };
};
