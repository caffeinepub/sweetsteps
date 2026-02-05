import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  type User = {
    createdAt : Time.Time;
    onboardingCompleted : Bool;
  };

  type Actor = {
    rbacBootstrapped : Bool;
    userProfiles : Map.Map<Principal, User>;
  };

  public func run(old : Actor) : Actor {
    old;
  };
};
