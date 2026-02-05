import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import AltSignup "AltSignup";

actor {
  // Setup authorization system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  var rbacBootstrapped : Bool = false;

  /// Lightweight update call that allows client to bring canister up to speed
  public shared ({ caller }) func warmup() : async { caller : Principal; time : Time.Time } {
    {
      caller;
      time = Time.now();
    };
  };

  // Bootstrap RBAC
  public shared ({ caller }) func bootstrapRBAC() : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can bootstrap RBAC");
    };
    rbacBootstrapped := true;
  };

  // Query to check RBAC status
  public query func getRBACStatus() : async {
    bootstrapped : Bool;
  } {
    {
      bootstrapped = rbacBootstrapped;
    };
  };

  // Legacy query for backwards compatibility
  public query func isRBACActive() : async Bool {
    rbacBootstrapped;
  };

  // User Profile Management
  type User = {
    createdAt : Time.Time;
    onboardingCompleted : Bool;
  };

  let userProfiles = Map.empty<Principal, User>();

  // Complete onboarding - fails closed if RBAC active but user unauthorized
  public shared ({ caller }) func completeOnboarding() : async () {
    // Require user permission if RBAC is bootstrapped
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

  // Check if user can access onboarding
  public query ({ caller }) func canAccessOnboarding() : async Bool {
    // Require user permission if RBAC is bootstrapped
    if (rbacBootstrapped and not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return false;
    };

    switch (userProfiles.get(caller)) {
      case (null) { true };
      case (?user) { not user.onboardingCompleted };
    };
  };

  // Get caller's user profile
  public query ({ caller }) func getCallerUserProfile() : async ?User {
    // Require user permission if RBAC is bootstrapped
    if (rbacBootstrapped and not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view profiles");
    };

    userProfiles.get(caller);
  };

  // Get any user's profile (admin can view all, users can view their own)
  public query ({ caller }) func getUserProfile(user : Principal) : async ?User {
    // Enforce access control if RBAC is bootstrapped
    if (
      rbacBootstrapped and caller != user and not AccessControl.isAdmin(accessControlState, caller)
    ) {
      Runtime.trap("Unauthorized: Can only view your own profile unless admin");
    };

    userProfiles.get(user);
  };

  // Save caller's user profile
  public shared ({ caller }) func saveCallerUserProfile(profile : User) : async () {
    // Require user permission if RBAC is bootstrapped
    if (rbacBootstrapped and not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can save profiles");
    };

    userProfiles.add(caller, profile);
  };

  // Alternative Signup Test
  public shared ({ caller }) func alternateSignup(username : Text, password : Text) : async {
    success : Bool;
    message : Text;
  } {
    // Authorization: Only guests/anonymous users should be able to sign up
    // If RBAC is bootstrapped and caller already has user/admin role, they shouldn't sign up again
    if (rbacBootstrapped and AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Already registered users cannot sign up again");
    };

    // Validate that caller is not anonymous when RBAC is active
    // (In production, you'd want proper identity verification)
    if (caller.isAnonymous()) {
      return {
        success = false;
        message = "Anonymous principals cannot sign up with username/password";
      };
    };

    // Validate inputs
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

    // Check if user already exists
    switch (userProfiles.get(caller)) {
      case (?_existing) {
        return {
          success = false;
          message = "User already registered";
        };
      };
      case null {
        // Proceed with signup
      };
    };

    // Handle the signup logic
    let signupResult = AltSignup.handleSignup(username, password);

    // If signup successful, create user profile and assign role
    if (signupResult.success) {
      let currentTime = Time.now();
      let newUser : User = {
        createdAt = currentTime;
        onboardingCompleted = false;
      };
      userProfiles.add(caller, newUser);

      // Assign user role if RBAC is bootstrapped
      if (rbacBootstrapped) {
        // Note: assignRole includes admin-only guard, so this would need to be called
        // by an admin or we need a different mechanism for self-registration
        // For now, we document this limitation
        // In production, you'd want a separate registration flow or auto-assignment
      };
    };

    signupResult;
  };
};
