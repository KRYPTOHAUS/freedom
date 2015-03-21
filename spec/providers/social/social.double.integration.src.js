var Promise = require("es6-promise").Promise;
module.exports = function(freedom, provider_url, freedomOpts) {
  var Social, ERRCODE;
  var c1 = null;
  var c2 = null;

  beforeEach(function(done) {
    var complete = function() {
      c1 = new Social();
      c2 = new Social();
      ERRCODE = c1.ERRCODE;
      done();
    };
    // Only create a freedom module the first time
    // Fails on Firefox otherwise
    if (typeof Social === "undefined") {
      freedom(provider_url, freedomOpts).then(function(constructor) {
        Social = constructor;
        complete();
      });
    } else {
      complete();
    }
  });
  
  afterEach(function(done) {
    Social.close(c1);
    Social.close(c2);
    c1 = null;
    c2 = null;
    done();
  });

  function makeClientState(userId, clientId, status) {
    return {
      userId: userId,
      clientId: clientId,
      status: status,
      lastUpdated: jasmine.any(Number),
      lastSeen: jasmine.any(Number)
    };
  }

  function makeUserProfile(userId) {
    return jasmine.objectContaining({
      userId: userId,
      lastUpdated: jasmine.any(Number)
    });
  }

  function errHandler(err) {
    console.error(err);
    expect(err).toBeUndefined();
  }

  it("A-B: sends message between A->B", function(done) {
    var c1State, c2State;
    var sent = false;
    var msg = "Hello World-" + Math.random();

    var trySend = function(info) {
       if (!sent &&
          typeof c2State !== "undefined" &&
          info.clientId == c2State.clientId &&
          info.status == "ONLINE") {
        sent = true;
        c1.sendMessage(c2State.clientId, msg).then(function(ret) {
          // Message sent
        }).catch(errHandler);
      }
    };

    c2.once("onMessage", function(message) {
      expect(message.from).toEqual(makeClientState(c1State.userId, c1State.clientId, "ONLINE"));
      expect(message.message).toEqual(msg);
      Promise.all([ c1.logout(), c2.logout() ]).then(done, errHandler);
    });

    c1.on("onClientState", trySend);

    Promise.all([ c1.login({ agent: "jasmine" }), c2.login({ agent: "jasmine" }) ]).then(function (ret) {
      c1State = ret[0];
      c2State = ret[1];
      
    }).catch(errHandler);
  });
  
  it("A-B: sends roster updates through the onChange event.", function(done) {
    var c1State, c2State = null;
    var receivedClientState = [];
    var receivedUserProfiles = [];
    var ranExpectations = false;
  
    c1.on("onUserProfile", function(info) {
      receivedUserProfiles.push(info);
    });

    c1.on("onClientState", function(info) {
      receivedClientState.push(info);
      if (c2State !== null) {
        // Only wanna see statuses from clientB
        receivedClientState = receivedClientState.filter(function(elt) {
          return elt.clientId == c2State.clientId;
        });
        //Expect to see ONLINE then OFFLINE from clientB
        if (!ranExpectations && receivedClientState.length >= 2 ) {
          ranExpectations = true;
          expect(receivedUserProfiles).toContain(makeUserProfile(c2State.userId));
          expect(receivedClientState).toContain(makeClientState(c2State.userId, c2State.clientId, "ONLINE"));
          expect(receivedClientState).toContain(makeClientState(c2State.userId, c2State.clientId, "OFFLINE"));
          c1.logout().then(done).catch(errHandler);
        }
      }
    });
    
    Promise.all([ c1.login({ agent: "jasmine" }), c2.login({ agent: "jasmine" }) ]).then(function (ret) {
      c1State = ret[0];
      c2State = ret[1];
      return c2.logout();
    }).catch(errHandler);
  });

  it("A-B: can return the roster", function(done) {
    var c1State, c2State;
    var triggered = false;
    var c1ProfileEvts = [];
    var c2ProfileEvts = [];
    var c1StateEvts = [];
    var c2StateEvts = [];

    // Checks if we saw user profiles for both clients
    var containsProfiles = function(evts) {
      var saw1 = false, saw2 = false;
      for (var i = 0; i < evts.length; i++) {
        if (evts[i].userId == c1State.userId) {
          saw1 = true;
        }
        if (evts[i].userId == c2State.userId) {
          saw2 = true;
        }
      }
      return saw1 && saw2;
    };
    
    // Checks if we saw client states for both clients
    var containsClients = function(evts) {
      var saw1 = false, saw2 = false;
      for (var i = 0; i < evts.length; i++) {
        if (evts[i].clientId == c1State.clientId) {
          saw1 = true;
        }
        if (evts[i].clientId == c2State.clientId) {
          saw2 = true;
        }
      }
      return saw1 && saw2;
    };

    // Triggered on every event, waiting until all necessary events are collected
    var tryGetRoster = function(arr, info) {
      if (typeof arr !== "undefined") {
        arr.push(info);
      }
      if (!triggered &&
          typeof c1State !== "undefined" &&
          typeof c2State !== "undefined" &&
          containsProfiles(c1ProfileEvts) &&
          containsProfiles(c2ProfileEvts) &&
          containsClients(c1StateEvts) &&
          containsClients(c2StateEvts)) {
        triggered = true;
        Promise.all([ c1.getUsers(), c2.getUsers(), c1.getClients(), c2.getClients() ]).then(function(ret) {
          expect(ret[0][c1State.userId]).toEqual(makeUserProfile(c1State.userId));
          expect(ret[0][c2State.userId]).toEqual(makeUserProfile(c2State.userId));
          expect(ret[1][c1State.userId]).toEqual(makeUserProfile(c1State.userId));
          expect(ret[1][c2State.userId]).toEqual(makeUserProfile(c2State.userId));
          expect(ret[2][c1State.clientId]).toEqual(makeClientState(c1State.userId, c1State.clientId, "ONLINE"));
          expect(ret[2][c2State.clientId]).toEqual(makeClientState(c2State.userId, c2State.clientId, "ONLINE"));
          expect(ret[3][c1State.clientId]).toEqual(makeClientState(c1State.userId, c1State.clientId, "ONLINE"));
          expect(ret[3][c2State.clientId]).toEqual(makeClientState(c2State.userId, c2State.clientId, "ONLINE"));
          return Promise.all([ c1.logout(), c2.logout() ]);
        }).then(done).catch(errHandler);
      }
    };

    c1.on("onUserProfile", tryGetRoster.bind({}, c1ProfileEvts));
    c2.on("onUserProfile", tryGetRoster.bind({}, c2ProfileEvts));
    c1.on("onClientState", tryGetRoster.bind({}, c1StateEvts));
    c2.on("onClientState", tryGetRoster.bind({}, c2StateEvts));

    Promise.all([ c1.login({ agent: "jasmine" }),  c2.login({ agent: "jasmine" }) ]).then(function(ret) {
      c1State = ret[0];
      c2State = ret[1];
      tryGetRoster();
    }).catch(errHandler);
  });

};

