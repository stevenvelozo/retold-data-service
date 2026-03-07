"use strict";

(function (f) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = f();
  } else if (typeof define === "function" && define.amd) {
    define([], f);
  } else {
    var g;
    if (typeof window !== "undefined") {
      g = window;
    } else if (typeof global !== "undefined") {
      g = global;
    } else if (typeof self !== "undefined") {
      g = self;
    } else {
      g = this;
    }
    g.dataCloner = f();
  }
})(function () {
  var define, module, exports;
  return function () {
    function r(e, n, t) {
      function o(i, f) {
        if (!n[i]) {
          if (!e[i]) {
            var c = "function" == typeof require && require;
            if (!f && c) return c(i, !0);
            if (u) return u(i, !0);
            var a = new Error("Cannot find module '" + i + "'");
            throw a.code = "MODULE_NOT_FOUND", a;
          }
          var p = n[i] = {
            exports: {}
          };
          e[i][0].call(p.exports, function (r) {
            var n = e[i][1][r];
            return o(n || r);
          }, p, p.exports, r, e, n, t);
        }
        return n[i].exports;
      }
      for (var u = "function" == typeof require && require, i = 0; i < t.length; i++) o(t[i]);
      return o;
    }
    return r;
  }()({
    1: [function (require, module, exports) {
      module.exports = {
        "name": "fable-serviceproviderbase",
        "version": "3.0.19",
        "description": "Simple base classes for fable services.",
        "main": "source/Fable-ServiceProviderBase.js",
        "scripts": {
          "start": "node source/Fable-ServiceProviderBase.js",
          "test": "npx quack test",
          "tests": "npx quack test -g",
          "coverage": "npx quack coverage",
          "build": "npx quack build",
          "types": "tsc -p ./tsconfig.build.json",
          "check": "tsc -p . --noEmit"
        },
        "types": "types/source/Fable-ServiceProviderBase.d.ts",
        "mocha": {
          "diff": true,
          "extension": ["js"],
          "package": "./package.json",
          "reporter": "spec",
          "slow": "75",
          "timeout": "5000",
          "ui": "tdd",
          "watch-files": ["source/**/*.js", "test/**/*.js"],
          "watch-ignore": ["lib/vendor"]
        },
        "repository": {
          "type": "git",
          "url": "https://github.com/stevenvelozo/fable-serviceproviderbase.git"
        },
        "keywords": ["entity", "behavior"],
        "author": "Steven Velozo <steven@velozo.com> (http://velozo.com/)",
        "license": "MIT",
        "bugs": {
          "url": "https://github.com/stevenvelozo/fable-serviceproviderbase/issues"
        },
        "homepage": "https://github.com/stevenvelozo/fable-serviceproviderbase",
        "devDependencies": {
          "@types/mocha": "^10.0.10",
          "fable": "^3.1.62",
          "quackage": "^1.0.58",
          "typescript": "^5.9.3"
        }
      };
    }, {}],
    2: [function (require, module, exports) {
      /**
      * Fable Service Base
      * @author <steven@velozo.com>
      */

      const libPackage = require('../package.json');
      class FableServiceProviderBase {
        /**
         * The constructor can be used in two ways:
         * 1) With a fable, options object and service hash (the options object and service hash are optional)a
         * 2) With an object or nothing as the first parameter, where it will be treated as the options object
         *
         * @param {import('fable')|Record<string, any>} [pFable] - (optional) The fable instance, or the options object if there is no fable
         * @param {Record<string, any>|string} [pOptions] - (optional) The options object, or the service hash if there is no fable
         * @param {string} [pServiceHash] - (optional) The service hash to identify this service instance
         */
        constructor(pFable, pOptions, pServiceHash) {
          /** @type {import('fable')} */
          this.fable;
          /** @type {string} */
          this.UUID;
          /** @type {Record<string, any>} */
          this.options;
          /** @type {Record<string, any>} */
          this.services;
          /** @type {Record<string, any>} */
          this.servicesMap;

          // Check if a fable was passed in; connect it if so
          if (typeof pFable === 'object' && pFable.isFable) {
            this.connectFable(pFable);
          } else {
            this.fable = false;
          }

          // Initialize the services map if it wasn't passed in
          /** @type {Record<string, any>} */
          this._PackageFableServiceProvider = libPackage;

          // initialize options and UUID based on whether the fable was passed in or not.
          if (this.fable) {
            this.UUID = pFable.getUUID();
            this.options = typeof pOptions === 'object' ? pOptions : {};
          } else {
            // With no fable, check to see if there was an object passed into either of the first two
            // Parameters, and if so, treat it as the options object
            this.options = typeof pFable === 'object' && !pFable.isFable ? pFable : typeof pOptions === 'object' ? pOptions : {};
            this.UUID = `CORE-SVC-${Math.floor(Math.random() * (99999 - 10000) + 10000)}`;
          }

          // It's expected that the deriving class will set this
          this.serviceType = `Unknown-${this.UUID}`;

          // The service hash is used to identify the specific instantiation of the service in the services map
          this.Hash = typeof pServiceHash === 'string' ? pServiceHash : !this.fable && typeof pOptions === 'string' ? pOptions : `${this.UUID}`;
        }

        /**
         * @param {import('fable')} pFable
         */
        connectFable(pFable) {
          if (typeof pFable !== 'object' || !pFable.isFable) {
            let tmpErrorMessage = `Fable Service Provider Base: Cannot connect to Fable, invalid Fable object passed in.  The pFable parameter was a [${typeof pFable}].}`;
            console.log(tmpErrorMessage);
            return new Error(tmpErrorMessage);
          }
          if (!this.fable) {
            this.fable = pFable;
          }
          if (!this.log) {
            this.log = this.fable.Logging;
          }
          if (!this.services) {
            this.services = this.fable.services;
          }
          if (!this.servicesMap) {
            this.servicesMap = this.fable.servicesMap;
          }
          return true;
        }
        static isFableService = true;
      }
      module.exports = FableServiceProviderBase;

      // This is left here in case we want to go back to having different code/base class for "core" services
      module.exports.CoreServiceProviderBase = FableServiceProviderBase;
    }, {
      "../package.json": 1
    }],
    3: [function (require, module, exports) {
      module.exports = {
        "name": "pict-application",
        "version": "1.0.33",
        "description": "Application base class for a pict view-based application",
        "main": "source/Pict-Application.js",
        "scripts": {
          "test": "npx quack test",
          "start": "node source/Pict-Application.js",
          "coverage": "npx quack coverage",
          "build": "npx quack build",
          "docker-dev-build": "docker build ./ -f Dockerfile_LUXURYCode -t pict-application-image:local",
          "docker-dev-run": "docker run -it -d --name pict-application-dev -p 30001:8080 -p 38086:8086 -v \"$PWD/.config:/home/coder/.config\"  -v \"$PWD:/home/coder/pict-application\" -u \"$(id -u):$(id -g)\" -e \"DOCKER_USER=$USER\" pict-application-image:local",
          "docker-dev-shell": "docker exec -it pict-application-dev /bin/bash",
          "tests": "npx quack test -g",
          "lint": "eslint source/**",
          "types": "tsc -p ."
        },
        "types": "types/source/Pict-Application.d.ts",
        "repository": {
          "type": "git",
          "url": "git+https://github.com/stevenvelozo/pict-application.git"
        },
        "author": "steven velozo <steven@velozo.com>",
        "license": "MIT",
        "bugs": {
          "url": "https://github.com/stevenvelozo/pict-application/issues"
        },
        "homepage": "https://github.com/stevenvelozo/pict-application#readme",
        "devDependencies": {
          "@eslint/js": "^9.28.0",
          "browser-env": "^3.3.0",
          "eslint": "^9.28.0",
          "pict": "^1.0.348",
          "pict-provider": "^1.0.10",
          "pict-view": "^1.0.66",
          "quackage": "^1.0.58",
          "typescript": "^5.9.3"
        },
        "mocha": {
          "diff": true,
          "extension": ["js"],
          "package": "./package.json",
          "reporter": "spec",
          "slow": "75",
          "timeout": "5000",
          "ui": "tdd",
          "watch-files": ["source/**/*.js", "test/**/*.js"],
          "watch-ignore": ["lib/vendor"]
        },
        "dependencies": {
          "fable-serviceproviderbase": "^3.0.19"
        }
      };
    }, {}],
    4: [function (require, module, exports) {
      const libFableServiceBase = require('fable-serviceproviderbase');
      const libPackage = require('../package.json');
      const defaultPictSettings = {
        Name: 'DefaultPictApplication',
        // The main "viewport" is the view that is used to host our application
        MainViewportViewIdentifier: 'Default-View',
        MainViewportRenderableHash: false,
        MainViewportDestinationAddress: false,
        MainViewportDefaultDataAddress: false,
        // Whether or not we should automatically render the main viewport and other autorender views after we initialize the pict application
        AutoSolveAfterInitialize: true,
        AutoRenderMainViewportViewAfterInitialize: true,
        AutoRenderViewsAfterInitialize: false,
        AutoLoginAfterInitialize: false,
        AutoLoadDataAfterLogin: false,
        ConfigurationOnlyViews: [],
        Manifests: {},
        // The prefix to prepend on all template destination hashes
        IdentifierAddressPrefix: 'PICT-'
      };

      /**
       * Base class for pict applications.
       */
      class PictApplication extends libFableServiceBase {
        /**
         * @param {import('fable')} pFable
         * @param {Record<string, any>} [pOptions]
         * @param {string} [pServiceHash]
         */
        constructor(pFable, pOptions, pServiceHash) {
          let tmpCarryOverConfiguration = typeof pFable.settings.PictApplicationConfiguration === 'object' ? pFable.settings.PictApplicationConfiguration : {};
          let tmpOptions = Object.assign({}, JSON.parse(JSON.stringify(defaultPictSettings)), tmpCarryOverConfiguration, pOptions);
          super(pFable, tmpOptions, pServiceHash);

          /** @type {any} */
          this.options;
          /** @type {any} */
          this.log;
          /** @type {import('pict') & import('fable')} */
          this.fable;
          /** @type {string} */
          this.UUID;
          /** @type {string} */
          this.Hash;
          /**
           * @type {{ [key: string]: any }}
           */
          this.servicesMap;
          this.serviceType = 'PictApplication';
          /** @type {Record<string, any>} */
          this._Package = libPackage;

          // Convenience and consistency naming
          this.pict = this.fable;
          // Wire in the essential Pict state
          /** @type {Record<string, any>} */
          this.AppData = this.fable.AppData;
          /** @type {Record<string, any>} */
          this.Bundle = this.fable.Bundle;

          /** @type {number} */
          this.initializeTimestamp;
          /** @type {number} */
          this.lastSolvedTimestamp;
          /** @type {number} */
          this.lastLoginTimestamp;
          /** @type {number} */
          this.lastMarshalFromViewsTimestamp;
          /** @type {number} */
          this.lastMarshalToViewsTimestamp;
          /** @type {number} */
          this.lastAutoRenderTimestamp;
          /** @type {number} */
          this.lastLoadDataTimestamp;

          // Load all the manifests for the application
          let tmpManifestKeys = Object.keys(this.options.Manifests);
          if (tmpManifestKeys.length > 0) {
            for (let i = 0; i < tmpManifestKeys.length; i++) {
              // Load each manifest
              let tmpManifestKey = tmpManifestKeys[i];
              this.fable.instantiateServiceProvider('Manifest', this.options.Manifests[tmpManifestKey], tmpManifestKey);
            }
          }
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Solve All Views                          */
        /* -------------------------------------------------------------------------- */
        /**
         * @return {boolean}
         */
        onPreSolve() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onPreSolve:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onPreSolveAsync(fCallback) {
          this.onPreSolve();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        onBeforeSolve() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onBeforeSolve:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onBeforeSolveAsync(fCallback) {
          this.onBeforeSolve();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        onSolve() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onSolve:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onSolveAsync(fCallback) {
          this.onSolve();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        solve() {
          if (this.pict.LogNoisiness > 2) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} executing solve() function...`);
          }

          // Walk through any loaded providers and solve them as well.
          let tmpLoadedProviders = Object.keys(this.pict.providers);
          let tmpProvidersToSolve = [];
          for (let i = 0; i < tmpLoadedProviders.length; i++) {
            let tmpProvider = this.pict.providers[tmpLoadedProviders[i]];
            if (tmpProvider.options.AutoSolveWithApp) {
              tmpProvidersToSolve.push(tmpProvider);
            }
          }
          // Sort the providers by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
          tmpProvidersToSolve.sort((a, b) => {
            return a.options.AutoSolveOrdinal - b.options.AutoSolveOrdinal;
          });
          for (let i = 0; i < tmpProvidersToSolve.length; i++) {
            tmpProvidersToSolve[i].solve(tmpProvidersToSolve[i]);
          }
          this.onBeforeSolve();
          // Now walk through any loaded views and initialize them as well.
          let tmpLoadedViews = Object.keys(this.pict.views);
          let tmpViewsToSolve = [];
          for (let i = 0; i < tmpLoadedViews.length; i++) {
            let tmpView = this.pict.views[tmpLoadedViews[i]];
            if (tmpView.options.AutoInitialize) {
              tmpViewsToSolve.push(tmpView);
            }
          }
          // Sort the views by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
          tmpViewsToSolve.sort((a, b) => {
            return a.options.AutoInitializeOrdinal - b.options.AutoInitializeOrdinal;
          });
          for (let i = 0; i < tmpViewsToSolve.length; i++) {
            tmpViewsToSolve[i].solve();
          }
          this.onSolve();
          this.onAfterSolve();
          this.lastSolvedTimestamp = this.fable.log.getTimeStamp();
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        solveAsync(fCallback) {
          let tmpAnticipate = this.fable.instantiateServiceProviderWithoutRegistration('Anticipate');
          tmpAnticipate.anticipate(this.onBeforeSolveAsync.bind(this));

          // Allow the callback to be passed in as the last parameter no matter what
          let tmpCallback = typeof fCallback === 'function' ? fCallback : false;
          if (!tmpCallback) {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} solveAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} solveAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          // Walk through any loaded providers and solve them as well.
          let tmpLoadedProviders = Object.keys(this.pict.providers);
          let tmpProvidersToSolve = [];
          for (let i = 0; i < tmpLoadedProviders.length; i++) {
            let tmpProvider = this.pict.providers[tmpLoadedProviders[i]];
            if (tmpProvider.options.AutoSolveWithApp) {
              tmpProvidersToSolve.push(tmpProvider);
            }
          }
          // Sort the providers by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
          tmpProvidersToSolve.sort((a, b) => {
            return a.options.AutoSolveOrdinal - b.options.AutoSolveOrdinal;
          });
          for (let i = 0; i < tmpProvidersToSolve.length; i++) {
            tmpAnticipate.anticipate(tmpProvidersToSolve[i].solveAsync.bind(tmpProvidersToSolve[i]));
          }

          // Walk through any loaded views and solve them as well.
          let tmpLoadedViews = Object.keys(this.pict.views);
          let tmpViewsToSolve = [];
          for (let i = 0; i < tmpLoadedViews.length; i++) {
            let tmpView = this.pict.views[tmpLoadedViews[i]];
            if (tmpView.options.AutoSolveWithApp) {
              tmpViewsToSolve.push(tmpView);
            }
          }
          // Sort the views by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
          tmpViewsToSolve.sort((a, b) => {
            return a.options.AutoSolveOrdinal - b.options.AutoSolveOrdinal;
          });
          for (let i = 0; i < tmpViewsToSolve.length; i++) {
            tmpAnticipate.anticipate(tmpViewsToSolve[i].solveAsync.bind(tmpViewsToSolve[i]));
          }
          tmpAnticipate.anticipate(this.onSolveAsync.bind(this));
          tmpAnticipate.anticipate(this.onAfterSolveAsync.bind(this));
          tmpAnticipate.wait(pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} solveAsync() complete.`);
            }
            this.lastSolvedTimestamp = this.fable.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * @return {boolean}
         */
        onAfterSolve() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onAfterSolve:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onAfterSolveAsync(fCallback) {
          this.onAfterSolve();
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Application Login                        */
        /* -------------------------------------------------------------------------- */

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onBeforeLoginAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onBeforeLoginAsync:`);
          }
          return fCallback();
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onLoginAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onLoginAsync:`);
          }
          return fCallback();
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        loginAsync(fCallback) {
          const tmpAnticipate = this.fable.instantiateServiceProviderWithoutRegistration('Anticipate');
          let tmpCallback = fCallback;
          if (typeof tmpCallback !== 'function') {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} loginAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} loginAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          tmpAnticipate.anticipate(this.onBeforeLoginAsync.bind(this));
          tmpAnticipate.anticipate(this.onLoginAsync.bind(this));
          tmpAnticipate.anticipate(this.onAfterLoginAsync.bind(this));

          // check and see if we should automatically trigger a data load
          if (this.options.AutoLoadDataAfterLogin) {
            tmpAnticipate.anticipate(fNext => {
              if (!this.isLoggedIn()) {
                return fNext();
              }
              if (this.pict.LogNoisiness > 1) {
                this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} auto loading data after login...`);
              }
              //TODO: should data load errors funnel here? this creates a weird coupling between login and data load callbacks
              this.loadDataAsync(pError => {
                fNext(pError);
              });
            });
          }
          tmpAnticipate.wait(pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} loginAsync() complete.`);
            }
            this.lastLoginTimestamp = this.fable.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * Check if the application state is logged in. Defaults to true. Override this method in your application based on login requirements.
         *
         * @return {boolean}
         */
        isLoggedIn() {
          return true;
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onAfterLoginAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onAfterLoginAsync:`);
          }
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Application LoadData                     */
        /* -------------------------------------------------------------------------- */

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onBeforeLoadDataAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onBeforeLoadDataAsync:`);
          }
          return fCallback();
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onLoadDataAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onLoadDataAsync:`);
          }
          return fCallback();
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        loadDataAsync(fCallback) {
          const tmpAnticipate = this.fable.instantiateServiceProviderWithoutRegistration('Anticipate');
          let tmpCallback = fCallback;
          if (typeof tmpCallback !== 'function') {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} loadDataAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} loadDataAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          tmpAnticipate.anticipate(this.onBeforeLoadDataAsync.bind(this));

          // Walk through any loaded providers and load their data as well.
          let tmpLoadedProviders = Object.keys(this.pict.providers);
          let tmpProvidersToLoadData = [];
          for (let i = 0; i < tmpLoadedProviders.length; i++) {
            let tmpProvider = this.pict.providers[tmpLoadedProviders[i]];
            if (tmpProvider.options.AutoLoadDataWithApp) {
              tmpProvidersToLoadData.push(tmpProvider);
            }
          }
          // Sort the providers by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
          tmpProvidersToLoadData.sort((a, b) => {
            return a.options.AutoLoadDataOrdinal - b.options.AutoLoadDataOrdinal;
          });
          for (const tmpProvider of tmpProvidersToLoadData) {
            tmpAnticipate.anticipate(tmpProvider.onBeforeLoadDataAsync.bind(tmpProvider));
          }
          tmpAnticipate.anticipate(this.onLoadDataAsync.bind(this));

          //TODO: think about ways to parallelize these
          for (const tmpProvider of tmpProvidersToLoadData) {
            tmpAnticipate.anticipate(tmpProvider.onLoadDataAsync.bind(tmpProvider));
          }
          tmpAnticipate.anticipate(this.onAfterLoadDataAsync.bind(this));
          for (const tmpProvider of tmpProvidersToLoadData) {
            tmpAnticipate.anticipate(tmpProvider.onAfterLoadDataAsync.bind(tmpProvider));
          }
          tmpAnticipate.wait(/** @param {Error} [pError] */
          pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} loadDataAsync() complete.`);
            }
            this.lastLoadDataTimestamp = this.fable.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onAfterLoadDataAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onAfterLoadDataAsync:`);
          }
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Application SaveData                     */
        /* -------------------------------------------------------------------------- */

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onBeforeSaveDataAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onBeforeSaveDataAsync:`);
          }
          return fCallback();
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onSaveDataAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onSaveDataAsync:`);
          }
          return fCallback();
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        saveDataAsync(fCallback) {
          const tmpAnticipate = this.fable.instantiateServiceProviderWithoutRegistration('Anticipate');
          let tmpCallback = fCallback;
          if (typeof tmpCallback !== 'function') {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} saveDataAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} saveDataAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          tmpAnticipate.anticipate(this.onBeforeSaveDataAsync.bind(this));

          // Walk through any loaded providers and load their data as well.
          let tmpLoadedProviders = Object.keys(this.pict.providers);
          let tmpProvidersToSaveData = [];
          for (let i = 0; i < tmpLoadedProviders.length; i++) {
            let tmpProvider = this.pict.providers[tmpLoadedProviders[i]];
            if (tmpProvider.options.AutoSaveDataWithApp) {
              tmpProvidersToSaveData.push(tmpProvider);
            }
          }
          // Sort the providers by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
          tmpProvidersToSaveData.sort((a, b) => {
            return a.options.AutoSaveDataOrdinal - b.options.AutoSaveDataOrdinal;
          });
          for (const tmpProvider of tmpProvidersToSaveData) {
            tmpAnticipate.anticipate(tmpProvider.onBeforeSaveDataAsync.bind(tmpProvider));
          }
          tmpAnticipate.anticipate(this.onSaveDataAsync.bind(this));

          //TODO: think about ways to parallelize these
          for (const tmpProvider of tmpProvidersToSaveData) {
            tmpAnticipate.anticipate(tmpProvider.onSaveDataAsync.bind(tmpProvider));
          }
          tmpAnticipate.anticipate(this.onAfterSaveDataAsync.bind(this));
          for (const tmpProvider of tmpProvidersToSaveData) {
            tmpAnticipate.anticipate(tmpProvider.onAfterSaveDataAsync.bind(tmpProvider));
          }
          tmpAnticipate.wait(/** @param {Error} [pError] */
          pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} saveDataAsync() complete.`);
            }
            this.lastSaveDataTimestamp = this.fable.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onAfterSaveDataAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onAfterSaveDataAsync:`);
          }
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Initialize Application                   */
        /* -------------------------------------------------------------------------- */
        /**
         * @return {boolean}
         */
        onBeforeInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onBeforeInitialize:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onBeforeInitializeAsync(fCallback) {
          this.onBeforeInitialize();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        onInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onInitialize:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onInitializeAsync(fCallback) {
          this.onInitialize();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        initialize() {
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow APPLICATION [${this.UUID}]::[${this.Hash}] ${this.options.Name} initialize:`);
          }
          if (!this.initializeTimestamp) {
            this.onBeforeInitialize();
            if ('ConfigurationOnlyViews' in this.options) {
              // Load all the configuration only views
              for (let i = 0; i < this.options.ConfigurationOnlyViews.length; i++) {
                let tmpViewIdentifier = typeof this.options.ConfigurationOnlyViews[i].ViewIdentifier === 'undefined' ? `AutoView-${this.fable.getUUID()}` : this.options.ConfigurationOnlyViews[i].ViewIdentifier;
                this.log.info(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} adding configuration only view: ${tmpViewIdentifier}`);
                this.pict.addView(tmpViewIdentifier, this.options.ConfigurationOnlyViews[i]);
              }
            }
            this.onInitialize();

            // Walk through any loaded providers and initialize them as well.
            let tmpLoadedProviders = Object.keys(this.pict.providers);
            let tmpProvidersToInitialize = [];
            for (let i = 0; i < tmpLoadedProviders.length; i++) {
              let tmpProvider = this.pict.providers[tmpLoadedProviders[i]];
              if (tmpProvider.options.AutoInitialize) {
                tmpProvidersToInitialize.push(tmpProvider);
              }
            }
            // Sort the providers by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
            tmpProvidersToInitialize.sort((a, b) => {
              return a.options.AutoInitializeOrdinal - b.options.AutoInitializeOrdinal;
            });
            for (let i = 0; i < tmpProvidersToInitialize.length; i++) {
              tmpProvidersToInitialize[i].initialize();
            }

            // Now walk through any loaded views and initialize them as well.
            let tmpLoadedViews = Object.keys(this.pict.views);
            let tmpViewsToInitialize = [];
            for (let i = 0; i < tmpLoadedViews.length; i++) {
              let tmpView = this.pict.views[tmpLoadedViews[i]];
              if (tmpView.options.AutoInitialize) {
                tmpViewsToInitialize.push(tmpView);
              }
            }
            // Sort the views by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
            tmpViewsToInitialize.sort((a, b) => {
              return a.options.AutoInitializeOrdinal - b.options.AutoInitializeOrdinal;
            });
            for (let i = 0; i < tmpViewsToInitialize.length; i++) {
              tmpViewsToInitialize[i].initialize();
            }
            this.onAfterInitialize();
            if (this.options.AutoSolveAfterInitialize) {
              if (this.pict.LogNoisiness > 1) {
                this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} auto solving after initialization...`);
              }
              // Solve the template synchronously
              this.solve();
            }
            // Now check and see if we should automatically render as well
            if (this.options.AutoRenderMainViewportViewAfterInitialize) {
              if (this.pict.LogNoisiness > 1) {
                this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} auto rendering after initialization...`);
              }
              // Render the template synchronously
              this.render();
            }
            this.initializeTimestamp = this.fable.log.getTimeStamp();
            this.onCompletionOfInitialize();
            return true;
          } else {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} initialize called but initialization is already completed.  Aborting.`);
            return false;
          }
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        initializeAsync(fCallback) {
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow APPLICATION [${this.UUID}]::[${this.Hash}] ${this.options.Name} initializeAsync:`);
          }

          // Allow the callback to be passed in as the last parameter no matter what
          let tmpCallback = typeof fCallback === 'function' ? fCallback : false;
          if (!tmpCallback) {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} initializeAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} initializeAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          if (!this.initializeTimestamp) {
            let tmpAnticipate = this.fable.instantiateServiceProviderWithoutRegistration('Anticipate');
            if (this.pict.LogNoisiness > 3) {
              this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} beginning initialization...`);
            }
            if ('ConfigurationOnlyViews' in this.options) {
              // Load all the configuration only views
              for (let i = 0; i < this.options.ConfigurationOnlyViews.length; i++) {
                let tmpViewIdentifier = typeof this.options.ConfigurationOnlyViews[i].ViewIdentifier === 'undefined' ? `AutoView-${this.fable.getUUID()}` : this.options.ConfigurationOnlyViews[i].ViewIdentifier;
                this.log.info(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} adding configuration only view: ${tmpViewIdentifier}`);
                this.pict.addView(tmpViewIdentifier, this.options.ConfigurationOnlyViews[i]);
              }
            }
            tmpAnticipate.anticipate(this.onBeforeInitializeAsync.bind(this));
            tmpAnticipate.anticipate(this.onInitializeAsync.bind(this));

            // Walk through any loaded providers and solve them as well.
            let tmpLoadedProviders = Object.keys(this.pict.providers);
            let tmpProvidersToInitialize = [];
            for (let i = 0; i < tmpLoadedProviders.length; i++) {
              let tmpProvider = this.pict.providers[tmpLoadedProviders[i]];
              if (tmpProvider.options.AutoInitialize) {
                tmpProvidersToInitialize.push(tmpProvider);
              }
            }
            // Sort the providers by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
            tmpProvidersToInitialize.sort((a, b) => {
              return a.options.AutoInitializeOrdinal - b.options.AutoInitializeOrdinal;
            });
            for (let i = 0; i < tmpProvidersToInitialize.length; i++) {
              tmpAnticipate.anticipate(tmpProvidersToInitialize[i].initializeAsync.bind(tmpProvidersToInitialize[i]));
            }

            // Now walk through any loaded views and initialize them as well.
            // TODO: Some optimization cleverness could be gained by grouping them into a parallelized async operation, by ordinal.
            let tmpLoadedViews = Object.keys(this.pict.views);
            let tmpViewsToInitialize = [];
            for (let i = 0; i < tmpLoadedViews.length; i++) {
              let tmpView = this.pict.views[tmpLoadedViews[i]];
              if (tmpView.options.AutoInitialize) {
                tmpViewsToInitialize.push(tmpView);
              }
            }
            // Sort the views by their priority
            // If they are all the default priority 0, it will end up being add order due to JSON Object Property Key order stuff
            tmpViewsToInitialize.sort((a, b) => {
              return a.options.AutoInitializeOrdinal - b.options.AutoInitializeOrdinal;
            });
            for (let i = 0; i < tmpViewsToInitialize.length; i++) {
              let tmpView = tmpViewsToInitialize[i];
              tmpAnticipate.anticipate(tmpView.initializeAsync.bind(tmpView));
            }
            tmpAnticipate.anticipate(this.onAfterInitializeAsync.bind(this));
            if (this.options.AutoLoginAfterInitialize) {
              if (this.pict.LogNoisiness > 1) {
                this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} auto login (asynchronously) after initialization...`);
              }
              tmpAnticipate.anticipate(this.loginAsync.bind(this));
            }
            if (this.options.AutoSolveAfterInitialize) {
              if (this.pict.LogNoisiness > 1) {
                this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} auto solving (asynchronously) after initialization...`);
              }
              tmpAnticipate.anticipate(this.solveAsync.bind(this));
            }
            if (this.options.AutoRenderMainViewportViewAfterInitialize) {
              if (this.pict.LogNoisiness > 1) {
                this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} auto rendering (asynchronously) after initialization...`);
              }
              tmpAnticipate.anticipate(this.renderMainViewportAsync.bind(this));
            }
            tmpAnticipate.wait(pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} initializeAsync Error: ${pError.message || pError}`, {
                  stack: pError.stack
                });
              }
              this.initializeTimestamp = this.fable.log.getTimeStamp();
              if (this.pict.LogNoisiness > 2) {
                this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} initialization complete.`);
              }
              return tmpCallback();
            });
          } else {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} async initialize called but initialization is already completed.  Aborting.`);
            // TODO: Should this be an error?
            return this.onCompletionOfInitializeAsync(tmpCallback);
          }
        }

        /**
         * @return {boolean}
         */
        onAfterInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onAfterInitialize:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onAfterInitializeAsync(fCallback) {
          this.onAfterInitialize();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        onCompletionOfInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onCompletionOfInitialize:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onCompletionOfInitializeAsync(fCallback) {
          this.onCompletionOfInitialize();
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Marshal Data From All Views              */
        /* -------------------------------------------------------------------------- */
        /**
         * @return {boolean}
         */
        onBeforeMarshalFromViews() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onBeforeMarshalFromViews:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onBeforeMarshalFromViewsAsync(fCallback) {
          this.onBeforeMarshalFromViews();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        onMarshalFromViews() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onMarshalFromViews:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onMarshalFromViewsAsync(fCallback) {
          this.onMarshalFromViews();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        marshalFromViews() {
          if (this.pict.LogNoisiness > 2) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} executing marshalFromViews() function...`);
          }
          this.onBeforeMarshalFromViews();
          // Now walk through any loaded views and initialize them as well.
          let tmpLoadedViews = Object.keys(this.pict.views);
          let tmpViewsToMarshalFromViews = [];
          for (let i = 0; i < tmpLoadedViews.length; i++) {
            let tmpView = this.pict.views[tmpLoadedViews[i]];
            tmpViewsToMarshalFromViews.push(tmpView);
          }
          for (let i = 0; i < tmpViewsToMarshalFromViews.length; i++) {
            tmpViewsToMarshalFromViews[i].marshalFromView();
          }
          this.onMarshalFromViews();
          this.onAfterMarshalFromViews();
          this.lastMarshalFromViewsTimestamp = this.fable.log.getTimeStamp();
          return true;
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        marshalFromViewsAsync(fCallback) {
          let tmpAnticipate = this.fable.instantiateServiceProviderWithoutRegistration('Anticipate');

          // Allow the callback to be passed in as the last parameter no matter what
          let tmpCallback = typeof fCallback === 'function' ? fCallback : false;
          if (!tmpCallback) {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalFromViewsAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalFromViewsAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          tmpAnticipate.anticipate(this.onBeforeMarshalFromViewsAsync.bind(this));
          // Walk through any loaded views and marshalFromViews them as well.
          let tmpLoadedViews = Object.keys(this.pict.views);
          let tmpViewsToMarshalFromViews = [];
          for (let i = 0; i < tmpLoadedViews.length; i++) {
            let tmpView = this.pict.views[tmpLoadedViews[i]];
            tmpViewsToMarshalFromViews.push(tmpView);
          }
          for (let i = 0; i < tmpViewsToMarshalFromViews.length; i++) {
            tmpAnticipate.anticipate(tmpViewsToMarshalFromViews[i].marshalFromViewAsync.bind(tmpViewsToMarshalFromViews[i]));
          }
          tmpAnticipate.anticipate(this.onMarshalFromViewsAsync.bind(this));
          tmpAnticipate.anticipate(this.onAfterMarshalFromViewsAsync.bind(this));
          tmpAnticipate.wait(pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalFromViewsAsync() complete.`);
            }
            this.lastMarshalFromViewsTimestamp = this.fable.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * @return {boolean}
         */
        onAfterMarshalFromViews() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onAfterMarshalFromViews:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onAfterMarshalFromViewsAsync(fCallback) {
          this.onAfterMarshalFromViews();
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Marshal Data To All Views                */
        /* -------------------------------------------------------------------------- */
        /**
         * @return {boolean}
         */
        onBeforeMarshalToViews() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onBeforeMarshalToViews:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onBeforeMarshalToViewsAsync(fCallback) {
          this.onBeforeMarshalToViews();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        onMarshalToViews() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onMarshalToViews:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onMarshalToViewsAsync(fCallback) {
          this.onMarshalToViews();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        marshalToViews() {
          if (this.pict.LogNoisiness > 2) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} executing marshalToViews() function...`);
          }
          this.onBeforeMarshalToViews();
          // Now walk through any loaded views and initialize them as well.
          let tmpLoadedViews = Object.keys(this.pict.views);
          let tmpViewsToMarshalToViews = [];
          for (let i = 0; i < tmpLoadedViews.length; i++) {
            let tmpView = this.pict.views[tmpLoadedViews[i]];
            tmpViewsToMarshalToViews.push(tmpView);
          }
          for (let i = 0; i < tmpViewsToMarshalToViews.length; i++) {
            tmpViewsToMarshalToViews[i].marshalToView();
          }
          this.onMarshalToViews();
          this.onAfterMarshalToViews();
          this.lastMarshalToViewsTimestamp = this.fable.log.getTimeStamp();
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        marshalToViewsAsync(fCallback) {
          let tmpAnticipate = this.fable.instantiateServiceProviderWithoutRegistration('Anticipate');

          // Allow the callback to be passed in as the last parameter no matter what
          let tmpCallback = typeof fCallback === 'function' ? fCallback : false;
          if (!tmpCallback) {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalToViewsAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalToViewsAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          tmpAnticipate.anticipate(this.onBeforeMarshalToViewsAsync.bind(this));
          // Walk through any loaded views and marshalToViews them as well.
          let tmpLoadedViews = Object.keys(this.pict.views);
          let tmpViewsToMarshalToViews = [];
          for (let i = 0; i < tmpLoadedViews.length; i++) {
            let tmpView = this.pict.views[tmpLoadedViews[i]];
            tmpViewsToMarshalToViews.push(tmpView);
          }
          for (let i = 0; i < tmpViewsToMarshalToViews.length; i++) {
            tmpAnticipate.anticipate(tmpViewsToMarshalToViews[i].marshalToViewAsync.bind(tmpViewsToMarshalToViews[i]));
          }
          tmpAnticipate.anticipate(this.onMarshalToViewsAsync.bind(this));
          tmpAnticipate.anticipate(this.onAfterMarshalToViewsAsync.bind(this));
          tmpAnticipate.wait(pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalToViewsAsync() complete.`);
            }
            this.lastMarshalToViewsTimestamp = this.fable.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * @return {boolean}
         */
        onAfterMarshalToViews() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onAfterMarshalToViews:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onAfterMarshalToViewsAsync(fCallback) {
          this.onAfterMarshalToViews();
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Render View                              */
        /* -------------------------------------------------------------------------- */
        /**
         * @return {boolean}
         */
        onBeforeRender() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onBeforeRender:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onBeforeRenderAsync(fCallback) {
          this.onBeforeRender();
          return fCallback();
        }

        /**
         * @param {string} [pViewIdentifier] - The hash of the view to render. By default, the main viewport view is rendered.
         * @param {string} [pRenderableHash] - The hash of the renderable to render.
         * @param {string} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string} [pTemplateDataAddress] - The address where the data for the template is stored.
         *
         * TODO: Should we support objects for pTemplateDataAddress for parity with pict-view?
         */
        render(pViewIdentifier, pRenderableHash, pRenderDestinationAddress, pTemplateDataAddress) {
          let tmpViewIdentifier = typeof pViewIdentifier !== 'string' ? this.options.MainViewportViewIdentifier : pViewIdentifier;
          let tmpRenderableHash = typeof pRenderableHash !== 'string' ? this.options.MainViewportRenderableHash : pRenderableHash;
          let tmpRenderDestinationAddress = typeof pRenderDestinationAddress !== 'string' ? this.options.MainViewportDestinationAddress : pRenderDestinationAddress;
          let tmpTemplateDataAddress = typeof pTemplateDataAddress !== 'string' ? this.options.MainViewportDefaultDataAddress : pTemplateDataAddress;
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow APPLICATION [${this.UUID}]::[${this.Hash}] ${this.options.Name} VIEW Renderable[${tmpRenderableHash}] Destination[${tmpRenderDestinationAddress}] TemplateDataAddress[${tmpTemplateDataAddress}] render:`);
          }
          this.onBeforeRender();

          // Now get the view (by hash) from the loaded views
          let tmpView = typeof tmpViewIdentifier === 'string' ? this.servicesMap.PictView[tmpViewIdentifier] : false;
          if (!tmpView) {
            this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} could not render from View ${tmpViewIdentifier} because it is not a valid view.`);
            return false;
          }
          this.onRender();
          tmpView.render(tmpRenderableHash, tmpRenderDestinationAddress, tmpTemplateDataAddress);
          this.onAfterRender();
          return true;
        }
        /**
         * @return {boolean}
         */
        onRender() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onRender:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onRenderAsync(fCallback) {
          this.onRender();
          return fCallback();
        }

        /**
         * @param {string|((error?: Error) => void)} pViewIdentifier - The hash of the view to render. By default, the main viewport view is rendered. (or the callback)
         * @param {string|((error?: Error) => void)} [pRenderableHash] - The hash of the renderable to render. (or the callback)
         * @param {string|((error?: Error) => void)} [pRenderDestinationAddress] - The address where the renderable will be rendered. (or the callback)
         * @param {string|((error?: Error) => void)} [pTemplateDataAddress] - The address where the data for the template is stored. (or the callback)
         * @param {(error?: Error) => void} [fCallback] - The callback, if all other parameters are provided.
         *
         * TODO: Should we support objects for pTemplateDataAddress for parity with pict-view?
         */
        renderAsync(pViewIdentifier, pRenderableHash, pRenderDestinationAddress, pTemplateDataAddress, fCallback) {
          let tmpViewIdentifier = typeof pViewIdentifier !== 'string' ? this.options.MainViewportViewIdentifier : pViewIdentifier;
          let tmpRenderableHash = typeof pRenderableHash !== 'string' ? this.options.MainViewportRenderableHash : pRenderableHash;
          let tmpRenderDestinationAddress = typeof pRenderDestinationAddress !== 'string' ? this.options.MainViewportDestinationAddress : pRenderDestinationAddress;
          let tmpTemplateDataAddress = typeof pTemplateDataAddress !== 'string' ? this.options.MainViewportDefaultDataAddress : pTemplateDataAddress;

          // Allow the callback to be passed in as the last parameter no matter what
          let tmpCallback = typeof fCallback === 'function' ? fCallback : typeof pTemplateDataAddress === 'function' ? pTemplateDataAddress : typeof pRenderDestinationAddress === 'function' ? pRenderDestinationAddress : typeof pRenderableHash === 'function' ? pRenderableHash : typeof pViewIdentifier === 'function' ? pViewIdentifier : false;
          if (!tmpCallback) {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow APPLICATION [${this.UUID}]::[${this.Hash}] ${this.options.Name} VIEW Renderable[${tmpRenderableHash}] Destination[${tmpRenderDestinationAddress}] TemplateDataAddress[${tmpTemplateDataAddress}] renderAsync:`);
          }
          let tmpRenderAnticipate = this.fable.newAnticipate();
          tmpRenderAnticipate.anticipate(this.onBeforeRenderAsync.bind(this));
          let tmpView = typeof tmpViewIdentifier === 'string' ? this.servicesMap.PictView[tmpViewIdentifier] : false;
          if (!tmpView) {
            let tmpErrorMessage = `PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} could not asynchronously render from View ${tmpViewIdentifier} because it is not a valid view.`;
            if (this.pict.LogNoisiness > 3) {
              this.log.error(tmpErrorMessage);
            }
            return tmpCallback(new Error(tmpErrorMessage));
          }
          tmpRenderAnticipate.anticipate(this.onRenderAsync.bind(this));
          tmpRenderAnticipate.anticipate(fNext => {
            tmpView.renderAsync.call(tmpView, tmpRenderableHash, tmpRenderDestinationAddress, tmpTemplateDataAddress, fNext);
          });
          tmpRenderAnticipate.anticipate(this.onAfterRenderAsync.bind(this));
          return tmpRenderAnticipate.wait(tmpCallback);
        }

        /**
         * @return {boolean}
         */
        onAfterRender() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onAfterRender:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onAfterRenderAsync(fCallback) {
          this.onAfterRender();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        renderMainViewport() {
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow APPLICATION [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderMainViewport:`);
          }
          return this.render();
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        renderMainViewportAsync(fCallback) {
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow APPLICATION [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderMainViewportAsync:`);
          }
          return this.renderAsync(fCallback);
        }
        /**
         * @return {void}
         */
        renderAutoViews() {
          if (this.pict.LogNoisiness > 0) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} beginning renderAutoViews...`);
          }
          // Now walk through any loaded views and sort them by the AutoRender ordinal
          let tmpLoadedViews = Object.keys(this.pict.views);
          // Sort the views by their priority
          // If they are all the default priority 0, it will end up being add order due to JSON Object Property Key order stuff
          tmpLoadedViews.sort((a, b) => {
            return this.pict.views[a].options.AutoRenderOrdinal - this.pict.views[b].options.AutoRenderOrdinal;
          });
          for (let i = 0; i < tmpLoadedViews.length; i++) {
            let tmpView = this.pict.views[tmpLoadedViews[i]];
            if (tmpView.options.AutoRender) {
              tmpView.render();
            }
          }
          if (this.pict.LogNoisiness > 0) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderAutoViewsAsync complete.`);
          }
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        renderAutoViewsAsync(fCallback) {
          let tmpAnticipate = this.fable.instantiateServiceProviderWithoutRegistration('Anticipate');

          // Allow the callback to be passed in as the last parameter no matter what
          let tmpCallback = typeof fCallback === 'function' ? fCallback : false;
          if (!tmpCallback) {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderAutoViewsAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderAutoViewsAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          if (this.pict.LogNoisiness > 0) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} beginning renderAutoViewsAsync...`);
          }

          // Now walk through any loaded views and sort them by the AutoRender ordinal
          // TODO: Some optimization cleverness could be gained by grouping them into a parallelized async operation, by ordinal.
          let tmpLoadedViews = Object.keys(this.pict.views);
          // Sort the views by their priority
          // If they are all the default priority 0, it will end up being add order due to JSON Object Property Key order stuff
          tmpLoadedViews.sort((a, b) => {
            return this.pict.views[a].options.AutoRenderOrdinal - this.pict.views[b].options.AutoRenderOrdinal;
          });
          for (let i = 0; i < tmpLoadedViews.length; i++) {
            let tmpView = this.pict.views[tmpLoadedViews[i]];
            if (tmpView.options.AutoRender) {
              tmpAnticipate.anticipate(tmpView.renderAsync.bind(tmpView));
            }
          }
          tmpAnticipate.wait(pError => {
            this.lastAutoRenderTimestamp = this.fable.log.getTimeStamp();
            if (this.pict.LogNoisiness > 0) {
              this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderAutoViewsAsync complete.`);
            }
            return tmpCallback(pError);
          });
        }

        /**
         * @return {boolean}
         */
        get isPictApplication() {
          return true;
        }
      }
      module.exports = PictApplication;
    }, {
      "../package.json": 3,
      "fable-serviceproviderbase": 2
    }],
    5: [function (require, module, exports) {
      module.exports = {
        "name": "pict-provider",
        "version": "1.0.12",
        "description": "Pict Provider Base Class",
        "main": "source/Pict-Provider.js",
        "scripts": {
          "start": "node source/Pict-Provider.js",
          "test": "npx quack test",
          "tests": "npx quack test -g",
          "coverage": "npx quack coverage",
          "build": "npx quack build",
          "docker-dev-build": "docker build ./ -f Dockerfile_LUXURYCode -t pict-provider-image:local",
          "docker-dev-run": "docker run -it -d --name pict-provider-dev -p 24125:8080 -p 30027:8086 -v \"$PWD/.config:/home/coder/.config\"  -v \"$PWD:/home/coder/pict-provider\" -u \"$(id -u):$(id -g)\" -e \"DOCKER_USER=$USER\" pict-provider-image:local",
          "docker-dev-shell": "docker exec -it pict-provider-dev /bin/bash",
          "lint": "eslint source/**",
          "types": "tsc -p ."
        },
        "types": "types/source/Pict-Provider.d.ts",
        "repository": {
          "type": "git",
          "url": "git+https://github.com/stevenvelozo/pict-provider.git"
        },
        "author": "steven velozo <steven@velozo.com>",
        "license": "MIT",
        "bugs": {
          "url": "https://github.com/stevenvelozo/pict-provider/issues"
        },
        "homepage": "https://github.com/stevenvelozo/pict-provider#readme",
        "devDependencies": {
          "@eslint/js": "^9.39.1",
          "eslint": "^9.39.1",
          "pict": "^1.0.351",
          "quackage": "^1.0.58",
          "typescript": "^5.9.3"
        },
        "dependencies": {
          "fable-serviceproviderbase": "^3.0.19"
        },
        "mocha": {
          "diff": true,
          "extension": ["js"],
          "package": "./package.json",
          "reporter": "spec",
          "slow": "75",
          "timeout": "5000",
          "ui": "tdd",
          "watch-files": ["source/**/*.js", "test/**/*.js"],
          "watch-ignore": ["lib/vendor"]
        }
      };
    }, {}],
    6: [function (require, module, exports) {
      const libFableServiceBase = require('fable-serviceproviderbase');
      const libPackage = require('../package.json');
      const defaultPictProviderSettings = {
        ProviderIdentifier: false,
        // If this is set to true, when the App initializes this will.
        // After the App initializes, initialize will be called as soon as it's added.
        AutoInitialize: true,
        AutoInitializeOrdinal: 0,
        AutoLoadDataWithApp: true,
        AutoLoadDataOrdinal: 0,
        AutoSolveWithApp: true,
        AutoSolveOrdinal: 0,
        Manifests: {},
        Templates: []
      };
      class PictProvider extends libFableServiceBase {
        /**
         * @param {import('fable')} pFable - The Fable instance.
         * @param {Record<string, any>} [pOptions] - The options for the provider.
         * @param {string} [pServiceHash] - The service hash for the provider.
         */
        constructor(pFable, pOptions, pServiceHash) {
          // Intersect default options, parent constructor, service information
          let tmpOptions = Object.assign({}, JSON.parse(JSON.stringify(defaultPictProviderSettings)), pOptions);
          super(pFable, tmpOptions, pServiceHash);

          /** @type {import('fable') & import('pict') & { instantiateServiceProviderWithoutRegistration(pServiceType: string, pOptions?: Record<string, any>, pCustomServiceHash?: string): any }} */
          this.fable;
          /** @type {import('fable') & import('pict') & { instantiateServiceProviderWithoutRegistration(pServiceType: string, pOptions?: Record<string, any>, pCustomServiceHash?: string): any }} */
          this.pict;
          /** @type {any} */
          this.log;
          /** @type {Record<string, any>} */
          this.options;
          /** @type {string} */
          this.UUID;
          /** @type {string} */
          this.Hash;
          if (!this.options.ProviderIdentifier) {
            this.options.ProviderIdentifier = `AutoProviderID-${this.fable.getUUID()}`;
          }
          this.serviceType = 'PictProvider';
          /** @type {Record<string, any>} */
          this._Package = libPackage;

          // Convenience and consistency naming
          this.pict = this.fable;

          // Wire in the essential Pict application state
          /** @type {Record<string, any>} */
          this.AppData = this.pict.AppData;
          /** @type {Record<string, any>} */
          this.Bundle = this.pict.Bundle;
          this.initializeTimestamp = false;
          this.lastSolvedTimestamp = false;
          for (let i = 0; i < this.options.Templates.length; i++) {
            let tmpDefaultTemplate = this.options.Templates[i];
            if (!tmpDefaultTemplate.hasOwnProperty('Postfix') || !tmpDefaultTemplate.hasOwnProperty('Template')) {
              this.log.error(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} could not load Default Template ${i} in the options array.`, tmpDefaultTemplate);
            } else {
              if (!tmpDefaultTemplate.Source) {
                tmpDefaultTemplate.Source = `PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} options object.`;
              }
              this.pict.TemplateProvider.addDefaultTemplate(tmpDefaultTemplate.Prefix, tmpDefaultTemplate.Postfix, tmpDefaultTemplate.Template, tmpDefaultTemplate.Source);
            }
          }
        }

        /* -------------------------------------------------------------------------- */
        /*                        Code Section: Initialization                        */
        /* -------------------------------------------------------------------------- */
        onBeforeInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} onBeforeInitialize:`);
          }
          return true;
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after pre-pinitialization.
         *
         * @return {void}
         */
        onBeforeInitializeAsync(fCallback) {
          this.onBeforeInitialize();
          return fCallback();
        }
        onInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} onInitialize:`);
          }
          return true;
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after initialization.
         *
         * @return {void}
         */
        onInitializeAsync(fCallback) {
          this.onInitialize();
          return fCallback();
        }
        initialize() {
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow PROVIDER [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} initialize:`);
          }
          if (!this.initializeTimestamp) {
            this.onBeforeInitialize();
            this.onInitialize();
            this.onAfterInitialize();
            this.initializeTimestamp = this.pict.log.getTimeStamp();
            return true;
          } else {
            this.log.warn(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} initialize called but initialization is already completed.  Aborting.`);
            return false;
          }
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after initialization.
         *
         * @return {void}
         */
        initializeAsync(fCallback) {
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow PROVIDER [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} initializeAsync:`);
          }
          if (!this.initializeTimestamp) {
            let tmpAnticipate = this.pict.instantiateServiceProviderWithoutRegistration('Anticipate');
            if (this.pict.LogNoisiness > 0) {
              this.log.info(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} beginning initialization...`);
            }
            tmpAnticipate.anticipate(this.onBeforeInitializeAsync.bind(this));
            tmpAnticipate.anticipate(this.onInitializeAsync.bind(this));
            tmpAnticipate.anticipate(this.onAfterInitializeAsync.bind(this));
            tmpAnticipate.wait(pError => {
              this.initializeTimestamp = this.pict.log.getTimeStamp();
              if (pError) {
                this.log.error(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} initialization failed: ${pError.message || pError}`, {
                  Stack: pError.stack
                });
              } else if (this.pict.LogNoisiness > 0) {
                this.log.info(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} initialization complete.`);
              }
              return fCallback();
            });
          } else {
            this.log.warn(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} async initialize called but initialization is already completed.  Aborting.`);
            // TODO: Should this be an error?
            return fCallback();
          }
        }
        onAfterInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} onAfterInitialize:`);
          }
          return true;
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after initialization.
         *
         * @return {void}
         */
        onAfterInitializeAsync(fCallback) {
          this.onAfterInitialize();
          return fCallback();
        }
        onPreRender() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} onPreRender:`);
          }
          return true;
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after pre-render.
         *
         * @return {void}
         */
        onPreRenderAsync(fCallback) {
          this.onPreRender();
          return fCallback();
        }
        render() {
          return this.onPreRender();
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after render.
         *
         * @return {void}
         */
        renderAsync(fCallback) {
          this.onPreRender();
          return fCallback();
        }
        onPreSolve() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} onPreSolve:`);
          }
          return true;
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after pre-solve.
         *
         * @return {void}
         */
        onPreSolveAsync(fCallback) {
          this.onPreSolve();
          return fCallback();
        }
        solve() {
          return this.onPreSolve();
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after solve.
         *
         * @return {void}
         */
        solveAsync(fCallback) {
          this.onPreSolve();
          return fCallback();
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after the data pre-load.
         */
        onBeforeLoadDataAsync(fCallback) {
          return fCallback();
        }

        /**
         * Hook to allow the provider to load data during application data load.
         *
         * @param {(pError?: Error) => void} fCallback - The callback to call after the data load.
         */
        onLoadDataAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} onLoadDataAsync:`);
          }
          return fCallback();
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after the data post-load.
         */
        onAfterLoadDataAsync(fCallback) {
          return fCallback();
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after the data pre-load.
         *
         * @return {void}
         */
        onBeforeSaveDataAsync(fCallback) {
          return fCallback();
        }

        /**
         * Hook to allow the provider to load data during application data load.
         *
         * @param {(pError?: Error) => void} fCallback - The callback to call after the data load.
         *
         * @return {void}
         */
        onSaveDataAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} onSaveDataAsync:`);
          }
          return fCallback();
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after the data post-load.
         *
         * @return {void}
         */
        onAfterSaveDataAsync(fCallback) {
          return fCallback();
        }
      }
      module.exports = PictProvider;
    }, {
      "../package.json": 5,
      "fable-serviceproviderbase": 2
    }],
    7: [function (require, module, exports) {
      module.exports = {
        "name": "pict-view",
        "version": "1.0.67",
        "description": "Pict View Base Class",
        "main": "source/Pict-View.js",
        "scripts": {
          "test": "npx quack test",
          "tests": "npx quack test -g",
          "start": "node source/Pict-View.js",
          "coverage": "npx quack coverage",
          "build": "npx quack build",
          "docker-dev-build": "docker build ./ -f Dockerfile_LUXURYCode -t pict-view-image:local",
          "docker-dev-run": "docker run -it -d --name pict-view-dev -p 30001:8080 -p 38086:8086 -v \"$PWD/.config:/home/coder/.config\"  -v \"$PWD:/home/coder/pict-view\" -u \"$(id -u):$(id -g)\" -e \"DOCKER_USER=$USER\" pict-view-image:local",
          "docker-dev-shell": "docker exec -it pict-view-dev /bin/bash",
          "types": "tsc -p .",
          "lint": "eslint source/**"
        },
        "types": "types/source/Pict-View.d.ts",
        "repository": {
          "type": "git",
          "url": "git+https://github.com/stevenvelozo/pict-view.git"
        },
        "author": "steven velozo <steven@velozo.com>",
        "license": "MIT",
        "bugs": {
          "url": "https://github.com/stevenvelozo/pict-view/issues"
        },
        "homepage": "https://github.com/stevenvelozo/pict-view#readme",
        "devDependencies": {
          "@eslint/js": "^9.39.1",
          "browser-env": "^3.3.0",
          "eslint": "^9.39.1",
          "pict": "^1.0.348",
          "quackage": "^1.0.58",
          "typescript": "^5.9.3"
        },
        "mocha": {
          "diff": true,
          "extension": ["js"],
          "package": "./package.json",
          "reporter": "spec",
          "slow": "75",
          "timeout": "5000",
          "ui": "tdd",
          "watch-files": ["source/**/*.js", "test/**/*.js"],
          "watch-ignore": ["lib/vendor"]
        },
        "dependencies": {
          "fable": "^3.1.63",
          "fable-serviceproviderbase": "^3.0.19"
        }
      };
    }, {}],
    8: [function (require, module, exports) {
      const libFableServiceBase = require('fable-serviceproviderbase');
      const libPackage = require('../package.json');
      const defaultPictViewSettings = {
        DefaultRenderable: false,
        DefaultDestinationAddress: false,
        DefaultTemplateRecordAddress: false,
        ViewIdentifier: false,
        // If this is set to true, when the App initializes this will.
        // After the App initializes, initialize will be called as soon as it's added.
        AutoInitialize: true,
        AutoInitializeOrdinal: 0,
        // If this is set to true, when the App autorenders (on load) this will.
        // After the App initializes, render will be called as soon as it's added.
        AutoRender: true,
        AutoRenderOrdinal: 0,
        AutoSolveWithApp: true,
        AutoSolveOrdinal: 0,
        CSSHash: false,
        CSS: false,
        CSSProvider: false,
        CSSPriority: 500,
        Templates: [],
        DefaultTemplates: [],
        Renderables: [],
        Manifests: {}
      };

      /** @typedef {(error?: Error) => void} ErrorCallback */
      /** @typedef {number | boolean} PictTimestamp */

      /**
       * @typedef {'replace' | 'append' | 'prepend' | 'append_once' | 'virtual-assignment'} RenderMethod
       */
      /**
       * @typedef {Object} Renderable
       *
       * @property {string} RenderableHash - A unique hash for the renderable.
       * @property {string} TemplateHash - The hash of the template to use for rendering this renderable.
       * @property {string} [DefaultTemplateRecordAddress] - The default address for resolving the data record for this renderable.
       * @property {string} [ContentDestinationAddress] - The default address (DOM CSS selector) for rendering the content of this renderable.
       * @property {RenderMethod} [RenderMethod=replace] - The method to use when projecting the renderable to the DOM ('replace', 'append', 'prepend', 'append_once', 'virtual-assignment').
       * @property {string} [TestAddress] - The address to use for testing the renderable.
       * @property {string} [TransactionHash] - The transaction hash for the root renderable.
       * @property {string} [RootRenderableViewHash] - The hash of the root renderable.
       * @property {string} [Content] - The rendered content for this renderable, if applicable.
       */

      /**
       * Represents a view in the Pict ecosystem.
       */
      class PictView extends libFableServiceBase {
        /**
         * @param {any} pFable - The Fable object that this service is attached to.
         * @param {any} [pOptions] - (optional) The options for this service.
         * @param {string} [pServiceHash] - (optional) The hash of the service.
         */
        constructor(pFable, pOptions, pServiceHash) {
          // Intersect default options, parent constructor, service information
          let tmpOptions = Object.assign({}, JSON.parse(JSON.stringify(defaultPictViewSettings)), pOptions);
          super(pFable, tmpOptions, pServiceHash);
          //FIXME: add types to fable and ancillaries
          /** @type {any} */
          this.fable;
          /** @type {any} */
          this.options;
          /** @type {String} */
          this.UUID;
          /** @type {String} */
          this.Hash;
          /** @type {any} */
          this.log;
          const tmpHashIsUUID = this.Hash === this.UUID;
          //NOTE: since many places are using the view UUID as the HTML element ID, we prefix it to avoid starting with a number
          this.UUID = `V-${this.UUID}`;
          if (tmpHashIsUUID) {
            this.Hash = this.UUID;
          }
          if (!this.options.ViewIdentifier) {
            this.options.ViewIdentifier = `AutoViewID-${this.fable.getUUID()}`;
          }
          this.serviceType = 'PictView';
          /** @type {Record<string, any>} */
          this._Package = libPackage;
          // Convenience and consistency naming
          /** @type {import('pict') & { log: any, instantiateServiceProviderWithoutRegistration: (hash: String) => any, instantiateServiceProviderIfNotExists: (hash: string) => any, TransactionTracking: import('pict/types/source/services/Fable-Service-TransactionTracking') }} */
          this.pict = this.fable;
          // Wire in the essential Pict application state
          this.AppData = this.pict.AppData;
          this.Bundle = this.pict.Bundle;

          /** @type {PictTimestamp} */
          this.initializeTimestamp = false;
          /** @type {PictTimestamp} */
          this.lastSolvedTimestamp = false;
          /** @type {PictTimestamp} */
          this.lastRenderedTimestamp = false;
          /** @type {PictTimestamp} */
          this.lastMarshalFromViewTimestamp = false;
          /** @type {PictTimestamp} */
          this.lastMarshalToViewTimestamp = false;
          this.pict.instantiateServiceProviderIfNotExists('TransactionTracking');

          // Load all templates from the array in the options
          // Templates are in the form of {Hash:'Some-Template-Hash',Template:'Template content',Source:'TemplateSource'}
          for (let i = 0; i < this.options.Templates.length; i++) {
            let tmpTemplate = this.options.Templates[i];
            if (!('Hash' in tmpTemplate) || !('Template' in tmpTemplate)) {
              this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not load Template ${i} in the options array.`, tmpTemplate);
            } else {
              if (!tmpTemplate.Source) {
                tmpTemplate.Source = `PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} options object.`;
              }
              this.pict.TemplateProvider.addTemplate(tmpTemplate.Hash, tmpTemplate.Template, tmpTemplate.Source);
            }
          }

          // Load all default templates from the array in the options
          // Templates are in the form of {Prefix:'',Postfix:'-List-Row',Template:'Template content',Source:'TemplateSourceString'}
          for (let i = 0; i < this.options.DefaultTemplates.length; i++) {
            let tmpDefaultTemplate = this.options.DefaultTemplates[i];
            if (!('Postfix' in tmpDefaultTemplate) || !('Template' in tmpDefaultTemplate)) {
              this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not load Default Template ${i} in the options array.`, tmpDefaultTemplate);
            } else {
              if (!tmpDefaultTemplate.Source) {
                tmpDefaultTemplate.Source = `PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} options object.`;
              }
              this.pict.TemplateProvider.addDefaultTemplate(tmpDefaultTemplate.Prefix, tmpDefaultTemplate.Postfix, tmpDefaultTemplate.Template, tmpDefaultTemplate.Source);
            }
          }

          // Load the CSS if it's available
          if (this.options.CSS) {
            let tmpCSSHash = this.options.CSSHash ? this.options.CSSHash : `View-${this.options.ViewIdentifier}`;
            let tmpCSSProvider = this.options.CSSProvider ? this.options.CSSProvider : tmpCSSHash;
            this.pict.CSSMap.addCSS(tmpCSSHash, this.options.CSS, tmpCSSProvider, this.options.CSSPriority);
          }

          // Load all renderables
          // Renderables are launchable renderable instructions with templates
          // They look as such: {Identifier:'ContentEntry', TemplateHash:'Content-Entry-Section-Main', ContentDestinationAddress:'#ContentSection', RecordAddress:'AppData.Content.DefaultText', ManifestTransformation:'ManyfestHash', ManifestDestinationAddress:'AppData.Content.DataToTransformContent'}
          // The only parts that are necessary are Identifier and Template
          // A developer can then do render('ContentEntry') and it just kinda works.  Or they can override the ContentDestinationAddress
          /** @type {Record<String, Renderable>} */
          this.renderables = {};
          for (let i = 0; i < this.options.Renderables.length; i++) {
            /** @type {Renderable} */
            let tmpRenderable = this.options.Renderables[i];
            this.addRenderable(tmpRenderable);
          }
        }

        /**
         * Adds a renderable to the view.
         *
         * @param {string | Renderable} pRenderableHash - The hash of the renderable, or a renderable object.
         * @param {string} [pTemplateHash] - (optional) The hash of the template for the renderable.
         * @param {string} [pDefaultTemplateRecordAddress] - (optional) The default data address for the template.
         * @param {string} [pDefaultDestinationAddress] - (optional) The default destination address for the renderable.
         * @param {RenderMethod} [pRenderMethod=replace] - (optional) The method to use when rendering the renderable (ex. 'replace').
         */
        addRenderable(pRenderableHash, pTemplateHash, pDefaultTemplateRecordAddress, pDefaultDestinationAddress, pRenderMethod) {
          /** @type {Renderable} */
          let tmpRenderable;
          if (typeof pRenderableHash == 'object') {
            // The developer passed in the renderable as an object.
            // Use theirs instead!
            tmpRenderable = pRenderableHash;
          } else {
            /** @type {RenderMethod} */
            let tmpRenderMethod = typeof pRenderMethod !== 'string' ? pRenderMethod : 'replace';
            tmpRenderable = {
              RenderableHash: pRenderableHash,
              TemplateHash: pTemplateHash,
              DefaultTemplateRecordAddress: pDefaultTemplateRecordAddress,
              ContentDestinationAddress: pDefaultDestinationAddress,
              RenderMethod: tmpRenderMethod
            };
          }
          if (typeof tmpRenderable.RenderableHash != 'string' || typeof tmpRenderable.TemplateHash != 'string') {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not load Renderable; RenderableHash or TemplateHash are invalid.`, tmpRenderable);
          } else {
            if (this.pict.LogNoisiness > 0) {
              this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} adding renderable [${tmpRenderable.RenderableHash}] pointed to template ${tmpRenderable.TemplateHash}.`);
            }
            this.renderables[tmpRenderable.RenderableHash] = tmpRenderable;
          }
        }

        /* -------------------------------------------------------------------------- */
        /*                        Code Section: Initialization                        */
        /* -------------------------------------------------------------------------- */
        /**
         * Lifecycle hook that triggers before the view is initialized.
         */
        onBeforeInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onBeforeInitialize:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers before the view is initialized (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onBeforeInitializeAsync(fCallback) {
          this.onBeforeInitialize();
          return fCallback();
        }

        /**
         * Lifecycle hook that triggers when the view is initialized.
         */
        onInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onInitialize:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers when the view is initialized (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onInitializeAsync(fCallback) {
          this.onInitialize();
          return fCallback();
        }

        /**
         * Performs view initialization.
         */
        initialize() {
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow VIEW [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} initialize:`);
          }
          if (!this.initializeTimestamp) {
            this.onBeforeInitialize();
            this.onInitialize();
            this.onAfterInitialize();
            this.initializeTimestamp = this.pict.log.getTimeStamp();
            return true;
          } else {
            this.log.warn(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} initialize called but initialization is already completed.  Aborting.`);
            return false;
          }
        }

        /**
         * Performs view initialization (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        initializeAsync(fCallback) {
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow VIEW [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} initializeAsync:`);
          }
          if (!this.initializeTimestamp) {
            let tmpAnticipate = this.pict.instantiateServiceProviderWithoutRegistration('Anticipate');
            if (this.pict.LogNoisiness > 0) {
              this.log.info(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} beginning initialization...`);
            }
            tmpAnticipate.anticipate(this.onBeforeInitializeAsync.bind(this));
            tmpAnticipate.anticipate(this.onInitializeAsync.bind(this));
            tmpAnticipate.anticipate(this.onAfterInitializeAsync.bind(this));
            tmpAnticipate.wait(/** @param {Error} pError */
            pError => {
              if (pError) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} initialization failed: ${pError.message || pError}`, {
                  stack: pError.stack
                });
              }
              this.initializeTimestamp = this.pict.log.getTimeStamp();
              if (this.pict.LogNoisiness > 0) {
                this.log.info(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} initialization complete.`);
              }
              return fCallback();
            });
          } else {
            this.log.warn(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} async initialize called but initialization is already completed.  Aborting.`);
            // TODO: Should this be an error?
            return fCallback();
          }
        }
        onAfterInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onAfterInitialize:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers after the view is initialized (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onAfterInitializeAsync(fCallback) {
          this.onAfterInitialize();
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                            Code Section: Render                            */
        /* -------------------------------------------------------------------------- */
        /**
         * Lifecycle hook that triggers before the view is rendered.
         *
         * @param {Renderable} pRenderable - The renderable that will be rendered.
         */
        onBeforeRender(pRenderable) {
          // Overload this to mess with stuff before the content gets generated from the template
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onBeforeRender:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers before the view is rendered (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         * @param {Renderable} pRenderable - The renderable that will be rendered.
         */
        onBeforeRenderAsync(fCallback, pRenderable) {
          this.onBeforeRender(pRenderable);
          return fCallback();
        }

        /**
         * Lifecycle hook that triggers before the view is projected into the DOM.
         *
         * @param {Renderable} pRenderable - The renderable that will be projected.
         */
        onBeforeProject(pRenderable) {
          // Overload this to mess with stuff before the content gets generated from the template
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onBeforeProject:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers before the view is projected into the DOM (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         * @param {Renderable} pRenderable - The renderable that will be projected.
         */
        onBeforeProjectAsync(fCallback, pRenderable) {
          this.onBeforeProject(pRenderable);
          return fCallback();
        }

        /**
         * Builds the render options for a renderable.
         *
         * For DRY purposes on the three flavors of render.
         *
         * @param {string|ErrorCallback} [pRenderableHash] - The hash of the renderable to render.
         * @param {string|ErrorCallback} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|object|ErrorCallback} [pTemplateRecordAddress] - The address of (or actual obejct) where the data for the template is stored.
         */
        buildRenderOptions(pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress) {
          let tmpRenderOptions = {
            Valid: true
          };
          tmpRenderOptions.RenderableHash = typeof pRenderableHash === 'string' ? pRenderableHash : typeof this.options.DefaultRenderable == 'string' ? this.options.DefaultRenderable : false;
          if (!tmpRenderOptions.RenderableHash) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not find a suitable RenderableHash ${tmpRenderOptions.RenderableHash} (param ${pRenderableHash}because it is not a valid renderable.`);
            tmpRenderOptions.Valid = false;
          }
          tmpRenderOptions.Renderable = this.renderables[tmpRenderOptions.RenderableHash];
          if (!tmpRenderOptions.Renderable) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render ${tmpRenderOptions.RenderableHash} (param ${pRenderableHash}) because it does not exist.`);
            tmpRenderOptions.Valid = false;
          }
          tmpRenderOptions.DestinationAddress = typeof pRenderDestinationAddress === 'string' ? pRenderDestinationAddress : typeof tmpRenderOptions.Renderable.ContentDestinationAddress === 'string' ? tmpRenderOptions.Renderable.ContentDestinationAddress : typeof this.options.DefaultDestinationAddress === 'string' ? this.options.DefaultDestinationAddress : false;
          if (!tmpRenderOptions.DestinationAddress) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render ${tmpRenderOptions.RenderableHash} (param ${pRenderableHash}) because it does not have a valid destination address (param ${pRenderDestinationAddress}).`);
            tmpRenderOptions.Valid = false;
          }
          if (typeof pTemplateRecordAddress === 'object') {
            tmpRenderOptions.RecordAddress = 'Passed in as object';
            tmpRenderOptions.Record = pTemplateRecordAddress;
          } else {
            tmpRenderOptions.RecordAddress = typeof pTemplateRecordAddress === 'string' ? pTemplateRecordAddress : typeof tmpRenderOptions.Renderable.DefaultTemplateRecordAddress === 'string' ? tmpRenderOptions.Renderable.DefaultTemplateRecordAddress : typeof this.options.DefaultTemplateRecordAddress === 'string' ? this.options.DefaultTemplateRecordAddress : false;
            tmpRenderOptions.Record = typeof tmpRenderOptions.RecordAddress === 'string' ? this.pict.DataProvider.getDataByAddress(tmpRenderOptions.RecordAddress) : undefined;
          }
          return tmpRenderOptions;
        }

        /**
         * Assigns the content to the destination address.
         *
         * For DRY purposes on the three flavors of render.
         *
         * @param {Renderable} pRenderable - The renderable to render.
         * @param {string} pRenderDestinationAddress - The address where the renderable will be rendered.
         * @param {string} pContent - The content to render.
         * @returns {boolean} - Returns true if the content was assigned successfully.
         * @memberof PictView
         */
        assignRenderContent(pRenderable, pRenderDestinationAddress, pContent) {
          return this.pict.ContentAssignment.projectContent(pRenderable.RenderMethod, pRenderDestinationAddress, pContent, pRenderable.TestAddress);
        }

        /**
         * Render a renderable from this view.
         *
         * @param {string} [pRenderableHash] - The hash of the renderable to render.
         * @param {string} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|object} [pTemplateRecordAddress] - The address where the data for the template is stored.
         * @param {Renderable} [pRootRenderable] - The root renderable for the render operation, if applicable.
         * @return {boolean}
         */
        render(pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, pRootRenderable) {
          return this.renderWithScope(this, pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, pRootRenderable);
        }

        /**
         * Render a renderable from this view, providing a specifici scope for the template.
         *
         * @param {any} pScope - The scope to use for the template rendering.
         * @param {string} [pRenderableHash] - The hash of the renderable to render.
         * @param {string} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|object} [pTemplateRecordAddress] - The address where the data for the template is stored.
         * @param {Renderable} [pRootRenderable] - The root renderable for the render operation, if applicable.
         * @return {boolean}
         */
        renderWithScope(pScope, pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, pRootRenderable) {
          let tmpRenderableHash = typeof pRenderableHash === 'string' ? pRenderableHash : typeof this.options.DefaultRenderable == 'string' ? this.options.DefaultRenderable : false;
          if (!tmpRenderableHash) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render ${tmpRenderableHash} (param ${pRenderableHash}) because it is not a valid renderable.`);
            return false;
          }

          /** @type {Renderable} */
          let tmpRenderable;
          if (tmpRenderableHash == '__Virtual') {
            tmpRenderable = {
              RenderableHash: '__Virtual',
              TemplateHash: this.renderables[this.options.DefaultRenderable].TemplateHash,
              ContentDestinationAddress: typeof pRenderDestinationAddress === 'string' ? pRenderDestinationAddress : typeof tmpRenderable.ContentDestinationAddress === 'string' ? tmpRenderable.ContentDestinationAddress : typeof this.options.DefaultDestinationAddress === 'string' ? this.options.DefaultDestinationAddress : null,
              RenderMethod: 'virtual-assignment',
              TransactionHash: pRootRenderable && pRootRenderable.TransactionHash,
              RootRenderableViewHash: pRootRenderable && pRootRenderable.RootRenderableViewHash
            };
          } else {
            tmpRenderable = Object.assign({}, this.renderables[tmpRenderableHash]);
            tmpRenderable.ContentDestinationAddress = typeof pRenderDestinationAddress === 'string' ? pRenderDestinationAddress : typeof tmpRenderable.ContentDestinationAddress === 'string' ? tmpRenderable.ContentDestinationAddress : typeof this.options.DefaultDestinationAddress === 'string' ? this.options.DefaultDestinationAddress : null;
          }
          if (!tmpRenderable.TransactionHash) {
            tmpRenderable.TransactionHash = `ViewRender-V-${this.options.ViewIdentifier}-R-${tmpRenderableHash}-U-${this.pict.getUUID()}`;
            tmpRenderable.RootRenderableViewHash = this.Hash;
            this.pict.TransactionTracking.registerTransaction(tmpRenderable.TransactionHash);
          }
          if (!tmpRenderable) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render ${tmpRenderableHash} (param ${pRenderableHash}) because it does not exist.`);
            return false;
          }
          if (!tmpRenderable.ContentDestinationAddress) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render ${tmpRenderableHash} (param ${pRenderableHash}) because it does not have a valid destination address.`);
            return false;
          }
          let tmpRecordAddress;
          let tmpRecord;
          if (typeof pTemplateRecordAddress === 'object') {
            tmpRecord = pTemplateRecordAddress;
            tmpRecordAddress = 'Passed in as object';
          } else {
            tmpRecordAddress = typeof pTemplateRecordAddress === 'string' ? pTemplateRecordAddress : typeof tmpRenderable.DefaultTemplateRecordAddress === 'string' ? tmpRenderable.DefaultTemplateRecordAddress : typeof this.options.DefaultTemplateRecordAddress === 'string' ? this.options.DefaultTemplateRecordAddress : false;
            tmpRecord = typeof tmpRecordAddress === 'string' ? this.pict.DataProvider.getDataByAddress(tmpRecordAddress) : undefined;
          }

          // Execute the developer-overridable pre-render behavior
          this.onBeforeRender(tmpRenderable);
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow VIEW [${this.UUID}]::[${this.Hash}] Renderable[${tmpRenderableHash}] Destination[${tmpRenderable.ContentDestinationAddress}] TemplateRecordAddress[${tmpRecordAddress}] render:`);
          }
          if (this.pict.LogNoisiness > 0) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} Beginning Render of Renderable[${tmpRenderableHash}] to Destination [${tmpRenderable.ContentDestinationAddress}]...`);
          }
          // Generate the content output from the template and data
          tmpRenderable.Content = this.pict.parseTemplateByHash(tmpRenderable.TemplateHash, tmpRecord, null, [this], pScope, {
            RootRenderable: typeof pRootRenderable === 'object' ? pRootRenderable : tmpRenderable
          });
          if (this.pict.LogNoisiness > 0) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} Assigning Renderable[${tmpRenderableHash}] content length ${tmpRenderable.Content.length} to Destination [${tmpRenderable.ContentDestinationAddress}] using render method [${tmpRenderable.RenderMethod}].`);
          }
          this.onBeforeProject(tmpRenderable);
          this.onProject(tmpRenderable);
          if (tmpRenderable.RenderMethod !== 'virtual-assignment') {
            this.onAfterProject(tmpRenderable);

            // Execute the developer-overridable post-render behavior
            this.onAfterRender(tmpRenderable);
          }
          return true;
        }

        /**
         * Render a renderable from this view.
         *
         * @param {string|ErrorCallback} [pRenderableHash] - The hash of the renderable to render.
         * @param {string|ErrorCallback} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|object|ErrorCallback} [pTemplateRecordAddress] - The address where the data for the template is stored.
         * @param {Renderable|ErrorCallback} [pRootRenderable] - The root renderable for the render operation, if applicable.
         * @param {ErrorCallback} [fCallback] - The callback to call when the async operation is complete.
         *
         * @return {void}
         */
        renderAsync(pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, pRootRenderable, fCallback) {
          return this.renderWithScopeAsync(this, pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, pRootRenderable, fCallback);
        }

        /**
         * Render a renderable from this view.
         *
         * @param {any} pScope - The scope to use for the template rendering.
         * @param {string|ErrorCallback} [pRenderableHash] - The hash of the renderable to render.
         * @param {string|ErrorCallback} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|object|ErrorCallback} [pTemplateRecordAddress] - The address where the data for the template is stored.
         * @param {Renderable|ErrorCallback} [pRootRenderable] - The root renderable for the render operation, if applicable.
         * @param {ErrorCallback} [fCallback] - The callback to call when the async operation is complete.
         *
         * @return {void}
         */
        renderWithScopeAsync(pScope, pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, pRootRenderable, fCallback) {
          let tmpRenderableHash = typeof pRenderableHash === 'string' ? pRenderableHash : typeof this.options.DefaultRenderable == 'string' ? this.options.DefaultRenderable : false;

          // Allow the callback to be passed in as the last parameter no matter what
          /** @type {ErrorCallback} */
          let tmpCallback = typeof fCallback === 'function' ? fCallback : typeof pTemplateRecordAddress === 'function' ? pTemplateRecordAddress : typeof pRenderDestinationAddress === 'function' ? pRenderDestinationAddress : typeof pRenderableHash === 'function' ? pRenderableHash : typeof pRootRenderable === 'function' ? pRootRenderable : null;
          if (!tmpCallback) {
            this.log.warn(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          if (!tmpRenderableHash) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not asynchronously render ${tmpRenderableHash} (param ${pRenderableHash}because it is not a valid renderable.`);
            return tmpCallback(new Error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not asynchronously render ${tmpRenderableHash} (param ${pRenderableHash}because it is not a valid renderable.`));
          }

          /** @type {Renderable} */
          let tmpRenderable;
          if (tmpRenderableHash == '__Virtual') {
            tmpRenderable = {
              RenderableHash: '__Virtual',
              TemplateHash: this.renderables[this.options.DefaultRenderable].TemplateHash,
              ContentDestinationAddress: typeof pRenderDestinationAddress === 'string' ? pRenderDestinationAddress : typeof this.options.DefaultDestinationAddress === 'string' ? this.options.DefaultDestinationAddress : null,
              RenderMethod: 'virtual-assignment',
              TransactionHash: pRootRenderable && typeof pRootRenderable !== 'function' && pRootRenderable.TransactionHash,
              RootRenderableViewHash: pRootRenderable && typeof pRootRenderable !== 'function' && pRootRenderable.RootRenderableViewHash
            };
          } else {
            tmpRenderable = Object.assign({}, this.renderables[tmpRenderableHash]);
            tmpRenderable.ContentDestinationAddress = typeof pRenderDestinationAddress === 'string' ? pRenderDestinationAddress : typeof tmpRenderable.ContentDestinationAddress === 'string' ? tmpRenderable.ContentDestinationAddress : typeof this.options.DefaultDestinationAddress === 'string' ? this.options.DefaultDestinationAddress : null;
          }
          if (!tmpRenderable.TransactionHash) {
            tmpRenderable.TransactionHash = `ViewRender-V-${this.options.ViewIdentifier}-R-${tmpRenderableHash}-U-${this.pict.getUUID()}`;
            tmpRenderable.RootRenderableViewHash = this.Hash;
            this.pict.TransactionTracking.registerTransaction(tmpRenderable.TransactionHash);
          }
          if (!tmpRenderable) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render ${tmpRenderableHash} (param ${pRenderableHash}) because it does not exist.`);
            return tmpCallback(new Error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render ${tmpRenderableHash} (param ${pRenderableHash}) because it does not exist.`));
          }
          if (!tmpRenderable.ContentDestinationAddress) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render ${tmpRenderableHash} (param ${pRenderableHash}) because it does not have a valid destination address.`);
            return tmpCallback(new Error(`Could not render ${tmpRenderableHash}`));
          }
          let tmpRecordAddress;
          let tmpRecord;
          if (typeof pTemplateRecordAddress === 'object') {
            tmpRecord = pTemplateRecordAddress;
            tmpRecordAddress = 'Passed in as object';
          } else {
            tmpRecordAddress = typeof pTemplateRecordAddress === 'string' ? pTemplateRecordAddress : typeof tmpRenderable.DefaultTemplateRecordAddress === 'string' ? tmpRenderable.DefaultTemplateRecordAddress : typeof this.options.DefaultTemplateRecordAddress === 'string' ? this.options.DefaultTemplateRecordAddress : false;
            tmpRecord = typeof tmpRecordAddress === 'string' ? this.pict.DataProvider.getDataByAddress(tmpRecordAddress) : undefined;
          }
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow VIEW [${this.UUID}]::[${this.Hash}] Renderable[${tmpRenderableHash}] Destination[${tmpRenderable.ContentDestinationAddress}] TemplateRecordAddress[${tmpRecordAddress}] renderAsync:`);
          }
          if (this.pict.LogNoisiness > 2) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} Beginning Asynchronous Render (callback-style)...`);
          }
          let tmpAnticipate = this.fable.newAnticipate();
          tmpAnticipate.anticipate(fOnBeforeRenderCallback => {
            this.onBeforeRenderAsync(fOnBeforeRenderCallback, tmpRenderable);
          });
          tmpAnticipate.anticipate(fAsyncTemplateCallback => {
            // Render the template (asynchronously)
            this.pict.parseTemplateByHash(tmpRenderable.TemplateHash, tmpRecord, (pError, pContent) => {
              if (pError) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render (asynchronously) ${tmpRenderableHash} (param ${pRenderableHash}) because it did not parse the template.`, pError);
                return fAsyncTemplateCallback(pError);
              }
              tmpRenderable.Content = pContent;
              return fAsyncTemplateCallback();
            }, [this], pScope, {
              RootRenderable: typeof pRootRenderable === 'object' ? pRootRenderable : tmpRenderable
            });
          });
          tmpAnticipate.anticipate(fNext => {
            this.onBeforeProjectAsync(fNext, tmpRenderable);
          });
          tmpAnticipate.anticipate(fNext => {
            this.onProjectAsync(fNext, tmpRenderable);
          });
          if (tmpRenderable.RenderMethod !== 'virtual-assignment') {
            tmpAnticipate.anticipate(fNext => {
              this.onAfterProjectAsync(fNext, tmpRenderable);
            });

            // Execute the developer-overridable post-render behavior
            tmpAnticipate.anticipate(fNext => {
              this.onAfterRenderAsync(fNext, tmpRenderable);
            });
          }
          tmpAnticipate.wait(tmpCallback);
        }

        /**
         * Renders the default renderable.
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        renderDefaultAsync(fCallback) {
          // Render the default renderable
          this.renderAsync(fCallback);
        }

        /**
         * @param {string} [pRenderableHash] - The hash of the renderable to render.
         * @param {string} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|object} [pTemplateRecordAddress] - The address of (or actual obejct) where the data for the template is stored.
         */
        basicRender(pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress) {
          return this.basicRenderWithScope(this, pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress);
        }

        /**
         * @param {any} pScope - The scope to use for the template rendering.
         * @param {string} [pRenderableHash] - The hash of the renderable to render.
         * @param {string} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|object} [pTemplateRecordAddress] - The address of (or actual obejct) where the data for the template is stored.
         */
        basicRenderWithScope(pScope, pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress) {
          let tmpRenderOptions = this.buildRenderOptions(pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress);
          if (tmpRenderOptions.Valid) {
            this.assignRenderContent(tmpRenderOptions.Renderable, tmpRenderOptions.DestinationAddress, this.pict.parseTemplateByHash(tmpRenderOptions.Renderable.TemplateHash, tmpRenderOptions.Record, null, [this], pScope, {
              RootRenderable: tmpRenderOptions.Renderable
            }));
            return true;
          } else {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not perform a basic render of ${tmpRenderOptions.RenderableHash} because it is not valid.`);
            return false;
          }
        }

        /**
         * @param {string|ErrorCallback} [pRenderableHash] - The hash of the renderable to render.
         * @param {string|ErrorCallback} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|Object|ErrorCallback} [pTemplateRecordAddress] - The address of (or actual obejct) where the data for the template is stored.
         * @param {ErrorCallback} [fCallback] - The callback to call when the async operation is complete.
         */
        basicRenderAsync(pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, fCallback) {
          return this.basicRenderWithScopeAsync(this, pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, fCallback);
        }

        /**
         * @param {any} pScope - The scope to use for the template rendering.
         * @param {string|ErrorCallback} [pRenderableHash] - The hash of the renderable to render.
         * @param {string|ErrorCallback} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|Object|ErrorCallback} [pTemplateRecordAddress] - The address of (or actual obejct) where the data for the template is stored.
         * @param {ErrorCallback} [fCallback] - The callback to call when the async operation is complete.
         */
        basicRenderWithScopeAsync(pScope, pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, fCallback) {
          // Allow the callback to be passed in as the last parameter no matter what
          /** @type {ErrorCallback} */
          let tmpCallback = typeof fCallback === 'function' ? fCallback : typeof pTemplateRecordAddress === 'function' ? pTemplateRecordAddress : typeof pRenderDestinationAddress === 'function' ? pRenderDestinationAddress : typeof pRenderableHash === 'function' ? pRenderableHash : null;
          if (!tmpCallback) {
            this.log.warn(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} basicRenderAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} basicRenderAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          const tmpRenderOptions = this.buildRenderOptions(pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress);
          if (tmpRenderOptions.Valid) {
            this.pict.parseTemplateByHash(tmpRenderOptions.Renderable.TemplateHash, tmpRenderOptions.Record,
            /**
             * @param {Error} [pError] - The error that occurred during template parsing.
             * @param {string} [pContent] - The content that was rendered from the template.
             */
            (pError, pContent) => {
              if (pError) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render (asynchronously) ${tmpRenderOptions.RenderableHash} because it did not parse the template.`, pError);
                return tmpCallback(pError);
              }
              this.assignRenderContent(tmpRenderOptions.Renderable, tmpRenderOptions.DestinationAddress, pContent);
              return tmpCallback();
            }, [this], pScope, {
              RootRenderable: tmpRenderOptions.Renderable
            });
          } else {
            let tmpErrorMessage = `PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not perform a basic render of ${tmpRenderOptions.RenderableHash} because it is not valid.`;
            this.log.error(tmpErrorMessage);
            return tmpCallback(new Error(tmpErrorMessage));
          }
        }

        /**
         * @param {Renderable} pRenderable - The renderable that was rendered.
         */
        onProject(pRenderable) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onProject:`);
          }
          if (pRenderable.RenderMethod === 'virtual-assignment') {
            this.pict.TransactionTracking.pushToTransactionQueue(pRenderable.TransactionHash, {
              ViewHash: this.Hash,
              Renderable: pRenderable
            }, 'Deferred-Post-Content-Assignment');
          }
          if (this.pict.LogNoisiness > 0) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} Assigning Renderable[${pRenderable.RenderableHash}] content length ${pRenderable.Content.length} to Destination [${pRenderable.ContentDestinationAddress}] using Async render method ${pRenderable.RenderMethod}.`);
          }

          // Assign the content to the destination address
          this.pict.ContentAssignment.projectContent(pRenderable.RenderMethod, pRenderable.ContentDestinationAddress, pRenderable.Content, pRenderable.TestAddress);
          this.lastRenderedTimestamp = this.pict.log.getTimeStamp();
        }

        /**
         * Lifecycle hook that triggers after the view is projected into the DOM (async flow).
         *
         * @param {(error?: Error, content?: string) => void} fCallback - The callback to call when the async operation is complete.
         * @param {Renderable} pRenderable - The renderable that is being projected.
         */
        onProjectAsync(fCallback, pRenderable) {
          this.onProject(pRenderable);
          return fCallback();
        }

        /**
         * Lifecycle hook that triggers after the view is rendered.
         *
         * @param {Renderable} pRenderable - The renderable that was rendered.
         */
        onAfterRender(pRenderable) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onAfterRender:`);
          }
          if (pRenderable && pRenderable.RootRenderableViewHash === this.Hash) {
            const tmpTransactionQueue = this.pict.TransactionTracking.clearTransactionQueue(pRenderable.TransactionHash) || [];
            for (const tmpEvent of tmpTransactionQueue) {
              const tmpView = this.pict.views[tmpEvent.Data.ViewHash];
              if (!tmpView) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onAfterRender: Could not find view for transaction hash ${pRenderable.TransactionHash} and ViewHash ${tmpEvent.Data.ViewHash}.`);
                continue;
              }
              tmpView.onAfterProject();

              // Execute the developer-overridable post-render behavior
              tmpView.onAfterRender(tmpEvent.Data.Renderable);
            }
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers after the view is rendered (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         * @param {Renderable} pRenderable - The renderable that was rendered.
         */
        onAfterRenderAsync(fCallback, pRenderable) {
          this.onAfterRender(pRenderable);
          const tmpAnticipate = this.fable.newAnticipate();
          if (pRenderable && pRenderable.RootRenderableViewHash === this.Hash) {
            const queue = this.pict.TransactionTracking.clearTransactionQueue(pRenderable.TransactionHash) || [];
            for (const event of queue) {
              /** @type {PictView} */
              const tmpView = this.pict.views[event.Data.ViewHash];
              if (!tmpView) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onAfterRenderAsync: Could not find view for transaction hash ${pRenderable.TransactionHash} and ViewHash ${event.Data.ViewHash}.`);
                continue;
              }
              tmpAnticipate.anticipate(tmpView.onAfterProjectAsync.bind(tmpView));
              tmpAnticipate.anticipate(fNext => {
                tmpView.onAfterRenderAsync(fNext, event.Data.Renderable);
              });

              // Execute the developer-overridable post-render behavior
            }
          }
          return tmpAnticipate.wait(fCallback);
        }

        /**
         * Lifecycle hook that triggers after the view is projected into the DOM.
         *
         * @param {Renderable} pRenderable - The renderable that was projected.
         */
        onAfterProject(pRenderable) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onAfterProject:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers after the view is projected into the DOM (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         * @param {Renderable} pRenderable - The renderable that was projected.
         */
        onAfterProjectAsync(fCallback, pRenderable) {
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                            Code Section: Solver                            */
        /* -------------------------------------------------------------------------- */
        /**
         * Lifecycle hook that triggers before the view is solved.
         */
        onBeforeSolve() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onBeforeSolve:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers before the view is solved (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onBeforeSolveAsync(fCallback) {
          this.onBeforeSolve();
          return fCallback();
        }

        /**
         * Lifecycle hook that triggers when the view is solved.
         */
        onSolve() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onSolve:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers when the view is solved (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onSolveAsync(fCallback) {
          this.onSolve();
          return fCallback();
        }

        /**
         * Performs view solving and triggers lifecycle hooks.
         *
         * @return {boolean} - True if the view was solved successfully, false otherwise.
         */
        solve() {
          if (this.pict.LogNoisiness > 2) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} executing solve() function...`);
          }
          this.onBeforeSolve();
          this.onSolve();
          this.onAfterSolve();
          this.lastSolvedTimestamp = this.pict.log.getTimeStamp();
          return true;
        }

        /**
         * Performs view solving and triggers lifecycle hooks (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        solveAsync(fCallback) {
          let tmpAnticipate = this.pict.instantiateServiceProviderWithoutRegistration('Anticipate');

          /** @type {ErrorCallback} */
          let tmpCallback = typeof fCallback === 'function' ? fCallback : null;
          if (!tmpCallback) {
            this.log.warn(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} solveAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} solveAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          tmpAnticipate.anticipate(this.onBeforeSolveAsync.bind(this));
          tmpAnticipate.anticipate(this.onSolveAsync.bind(this));
          tmpAnticipate.anticipate(this.onAfterSolveAsync.bind(this));
          tmpAnticipate.wait(pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} solveAsync() complete.`);
            }
            this.lastSolvedTimestamp = this.pict.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * Lifecycle hook that triggers after the view is solved.
         */
        onAfterSolve() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onAfterSolve:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers after the view is solved (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onAfterSolveAsync(fCallback) {
          this.onAfterSolve();
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Marshal From View                        */
        /* -------------------------------------------------------------------------- */
        /**
         * Lifecycle hook that triggers before data is marshaled from the view.
         *
         * @return {boolean} - True if the operation was successful, false otherwise.
         */
        onBeforeMarshalFromView() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onBeforeMarshalFromView:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers before data is marshaled from the view (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onBeforeMarshalFromViewAsync(fCallback) {
          this.onBeforeMarshalFromView();
          return fCallback();
        }

        /**
         * Lifecycle hook that triggers when data is marshaled from the view.
         */
        onMarshalFromView() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onMarshalFromView:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers when data is marshaled from the view (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onMarshalFromViewAsync(fCallback) {
          this.onMarshalFromView();
          return fCallback();
        }

        /**
         * Marshals data from the view.
         *
         * @return {boolean} - True if the operation was successful, false otherwise.
         */
        marshalFromView() {
          if (this.pict.LogNoisiness > 2) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} executing solve() function...`);
          }
          this.onBeforeMarshalFromView();
          this.onMarshalFromView();
          this.onAfterMarshalFromView();
          this.lastMarshalFromViewTimestamp = this.pict.log.getTimeStamp();
          return true;
        }

        /**
         * Marshals data from the view (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        marshalFromViewAsync(fCallback) {
          let tmpAnticipate = this.pict.instantiateServiceProviderWithoutRegistration('Anticipate');

          /** @type {ErrorCallback} */
          let tmpCallback = typeof fCallback === 'function' ? fCallback : null;
          if (!tmpCallback) {
            this.log.warn(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalFromViewAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalFromViewAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          tmpAnticipate.anticipate(this.onBeforeMarshalFromViewAsync.bind(this));
          tmpAnticipate.anticipate(this.onMarshalFromViewAsync.bind(this));
          tmpAnticipate.anticipate(this.onAfterMarshalFromViewAsync.bind(this));
          tmpAnticipate.wait(pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} marshalFromViewAsync() complete.`);
            }
            this.lastMarshalFromViewTimestamp = this.pict.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * Lifecycle hook that triggers after data is marshaled from the view.
         */
        onAfterMarshalFromView() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onAfterMarshalFromView:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers after data is marshaled from the view (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onAfterMarshalFromViewAsync(fCallback) {
          this.onAfterMarshalFromView();
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Marshal To View                          */
        /* -------------------------------------------------------------------------- */
        /**
         * Lifecycle hook that triggers before data is marshaled into the view.
         */
        onBeforeMarshalToView() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onBeforeMarshalToView:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers before data is marshaled into the view (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onBeforeMarshalToViewAsync(fCallback) {
          this.onBeforeMarshalToView();
          return fCallback();
        }

        /**
         * Lifecycle hook that triggers when data is marshaled into the view.
         */
        onMarshalToView() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onMarshalToView:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers when data is marshaled into the view (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onMarshalToViewAsync(fCallback) {
          this.onMarshalToView();
          return fCallback();
        }

        /**
         * Marshals data into the view.
         *
         * @return {boolean} - True if the operation was successful, false otherwise.
         */
        marshalToView() {
          if (this.pict.LogNoisiness > 2) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} executing solve() function...`);
          }
          this.onBeforeMarshalToView();
          this.onMarshalToView();
          this.onAfterMarshalToView();
          this.lastMarshalToViewTimestamp = this.pict.log.getTimeStamp();
          return true;
        }

        /**
         * Marshals data into the view (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        marshalToViewAsync(fCallback) {
          let tmpAnticipate = this.pict.instantiateServiceProviderWithoutRegistration('Anticipate');

          /** @type {ErrorCallback} */
          let tmpCallback = typeof fCallback === 'function' ? fCallback : null;
          if (!tmpCallback) {
            this.log.warn(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalToViewAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalToViewAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          tmpAnticipate.anticipate(this.onBeforeMarshalToViewAsync.bind(this));
          tmpAnticipate.anticipate(this.onMarshalToViewAsync.bind(this));
          tmpAnticipate.anticipate(this.onAfterMarshalToViewAsync.bind(this));
          tmpAnticipate.wait(pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} marshalToViewAsync() complete.`);
            }
            this.lastMarshalToViewTimestamp = this.pict.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * Lifecycle hook that triggers after data is marshaled into the view.
         */
        onAfterMarshalToView() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onAfterMarshalToView:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers after data is marshaled into the view (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onAfterMarshalToViewAsync(fCallback) {
          this.onAfterMarshalToView();
          return fCallback();
        }

        /** @return {boolean} - True if the object is a PictView. */
        get isPictView() {
          return true;
        }
      }
      module.exports = PictView;
    }, {
      "../package.json": 7,
      "fable-serviceproviderbase": 2
    }],
    9: [function (require, module, exports) {
      module.exports = {
        "Name": "Retold Data Cloner",
        "Hash": "DataCloner",
        "MainViewportViewIdentifier": "DataCloner-Layout",
        "MainViewportDestinationAddress": "#DataCloner-Application-Container",
        "MainViewportDefaultDataAddress": "AppData.DataCloner",
        "pict_configuration": {
          "Product": "DataCloner"
        },
        "AutoRenderMainViewportViewAfterInitialize": false
      };
    }, {}],
    10: [function (require, module, exports) {
      const libPictApplication = require('pict-application');
      const libProvider = require('./providers/Pict-Provider-DataCloner.js');
      const libViewLayout = require('./views/PictView-DataCloner-Layout.js');
      const libViewConnection = require('./views/PictView-DataCloner-Connection.js');
      const libViewSession = require('./views/PictView-DataCloner-Session.js');
      const libViewSchema = require('./views/PictView-DataCloner-Schema.js');
      const libViewDeploy = require('./views/PictView-DataCloner-Deploy.js');
      const libViewSync = require('./views/PictView-DataCloner-Sync.js');
      const libViewExport = require('./views/PictView-DataCloner-Export.js');
      const libViewViewData = require('./views/PictView-DataCloner-ViewData.js');
      class DataClonerApplication extends libPictApplication {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);

          // Register provider
          this.pict.addProvider('DataCloner', libProvider.default_configuration, libProvider);

          // Register views
          this.pict.addView('DataCloner-Layout', libViewLayout.default_configuration, libViewLayout);
          this.pict.addView('DataCloner-Connection', libViewConnection.default_configuration, libViewConnection);
          this.pict.addView('DataCloner-Session', libViewSession.default_configuration, libViewSession);
          this.pict.addView('DataCloner-Schema', libViewSchema.default_configuration, libViewSchema);
          this.pict.addView('DataCloner-Deploy', libViewDeploy.default_configuration, libViewDeploy);
          this.pict.addView('DataCloner-Sync', libViewSync.default_configuration, libViewSync);
          this.pict.addView('DataCloner-Export', libViewExport.default_configuration, libViewExport);
          this.pict.addView('DataCloner-ViewData', libViewViewData.default_configuration, libViewViewData);
        }
        onAfterInitializeAsync(fCallback) {
          // Centralized state (replaces global variables)
          this.pict.AppData.DataCloner = {
            FetchedTables: [],
            DeployedTables: [],
            LastReport: null,
            ServerBusyAtLoad: false,
            SyncPollTimer: null,
            LiveStatusTimer: null,
            PersistFields: ['serverURL', 'authMethod', 'authURI', 'checkURI', 'cookieName', 'cookieValueAddr', 'cookieValueTemplate', 'loginMarker', 'userName', 'password', 'schemaURL', 'pageSize', 'dateTimePrecisionMS', 'connProvider', 'sqliteFilePath', 'mysqlServer', 'mysqlPort', 'mysqlUser', 'mysqlPassword', 'mysqlDatabase', 'mysqlConnectionLimit', 'mssqlServer', 'mssqlPort', 'mssqlUser', 'mssqlPassword', 'mssqlDatabase', 'mssqlConnectionLimit', 'postgresqlHost', 'postgresqlPort', 'postgresqlUser', 'postgresqlPassword', 'postgresqlDatabase', 'postgresqlConnectionLimit', 'solrHost', 'solrPort', 'solrCore', 'solrPath', 'mongodbHost', 'mongodbPort', 'mongodbUser', 'mongodbPassword', 'mongodbDatabase', 'mongodbConnectionLimit', 'rocksdbFolder', 'bibliographFolder']
          };

          // Make pict available for inline onclick handlers
          window.pict = this.pict;

          // Render layout (which chains child view renders via onAfterRender)
          this.pict.views['DataCloner-Layout'].render();

          // Post-render initialization
          this.pict.providers.DataCloner.initPersistence();
          this.pict.views['DataCloner-Connection'].onProviderChange();
          this.pict.providers.DataCloner.restoreDeployedTables();
          this.pict.providers.DataCloner.startLiveStatusPolling();
          this.pict.providers.DataCloner.initAccordionPreviews();
          this.pict.providers.DataCloner.updateAllPreviews();
          this.pict.views['DataCloner-Layout'].collapseAllSections();
          this.pict.providers.DataCloner.initAutoProcess();
          return fCallback();
        }
      }
      module.exports = DataClonerApplication;
      module.exports.default_configuration = require('./Pict-Application-DataCloner-Configuration.json');
    }, {
      "./Pict-Application-DataCloner-Configuration.json": 9,
      "./providers/Pict-Provider-DataCloner.js": 12,
      "./views/PictView-DataCloner-Connection.js": 13,
      "./views/PictView-DataCloner-Deploy.js": 14,
      "./views/PictView-DataCloner-Export.js": 15,
      "./views/PictView-DataCloner-Layout.js": 16,
      "./views/PictView-DataCloner-Schema.js": 17,
      "./views/PictView-DataCloner-Session.js": 18,
      "./views/PictView-DataCloner-Sync.js": 19,
      "./views/PictView-DataCloner-ViewData.js": 20,
      "pict-application": 4
    }],
    11: [function (require, module, exports) {
      module.exports = {
        DataClonerApplication: require('./Pict-Application-DataCloner.js')
      };
      if (typeof window !== 'undefined') {
        window.DataClonerApplication = module.exports.DataClonerApplication;
      }
    }, {
      "./Pict-Application-DataCloner.js": 10
    }],
    12: [function (require, module, exports) {
      const libPictProvider = require('pict-provider');
      class DataClonerProvider extends libPictProvider {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }

        // ================================================================
        // API Helper
        // ================================================================

        api(pMethod, pPath, pBody) {
          let tmpOpts = {
            method: pMethod,
            headers: {}
          };
          if (pBody) {
            tmpOpts.headers['Content-Type'] = 'application/json';
            tmpOpts.body = JSON.stringify(pBody);
          }
          return fetch(pPath, tmpOpts).then(function (pResponse) {
            return pResponse.json();
          });
        }
        setStatus(pElementId, pMessage, pType) {
          let tmpEl = document.getElementById(pElementId);
          if (!tmpEl) return;
          tmpEl.className = 'status ' + (pType || 'info');
          tmpEl.textContent = pMessage;
          tmpEl.style.display = 'block';
        }
        escapeHtml(pStr) {
          let tmpDiv = document.createElement('div');
          tmpDiv.appendChild(document.createTextNode(pStr));
          return tmpDiv.innerHTML;
        }

        // ================================================================
        // Phase status indicators
        // ================================================================

        setSectionPhase(pSection, pState) {
          let tmpEl = document.getElementById('phase' + pSection);
          if (!tmpEl) return;
          tmpEl.className = 'accordion-phase';
          if (pState === 'ok') {
            tmpEl.innerHTML = '&#10003;';
            tmpEl.classList.add('visible', 'accordion-phase-ok');
          } else if (pState === 'error') {
            tmpEl.innerHTML = '&#10007;';
            tmpEl.classList.add('visible', 'accordion-phase-error');
          } else if (pState === 'busy') {
            tmpEl.innerHTML = '<span class="phase-spinner"></span>';
            tmpEl.classList.add('visible', 'accordion-phase-busy');
          } else {
            tmpEl.innerHTML = '';
          }
        }

        // ================================================================
        // Accordion Previews
        // ================================================================

        updateAllPreviews() {
          // Section 1 — Database Connection
          let tmpProvider = document.getElementById('connProvider');
          if (!tmpProvider) return;
          tmpProvider = tmpProvider.value;
          let tmpPreview1 = tmpProvider;
          if (tmpProvider === 'SQLite') {
            let tmpPath = document.getElementById('sqliteFilePath').value || 'data/cloned.sqlite';
            tmpPreview1 = 'SQLite at ' + tmpPath;
          } else if (tmpProvider === 'MySQL') {
            let tmpHost = document.getElementById('mysqlServer').value || '127.0.0.1';
            let tmpPort = document.getElementById('mysqlPort').value || '3306';
            let tmpUser = document.getElementById('mysqlUser').value || 'root';
            tmpPreview1 = 'MySQL on ' + tmpHost + ':' + tmpPort + ' as ' + tmpUser;
          } else if (tmpProvider === 'MSSQL') {
            let tmpHost = document.getElementById('mssqlServer').value || '127.0.0.1';
            let tmpPort = document.getElementById('mssqlPort').value || '1433';
            let tmpUser = document.getElementById('mssqlUser').value || 'sa';
            tmpPreview1 = 'MSSQL on ' + tmpHost + ':' + tmpPort + ' as ' + tmpUser;
          } else if (tmpProvider === 'PostgreSQL') {
            let tmpHost = document.getElementById('postgresqlHost').value || '127.0.0.1';
            let tmpPort = document.getElementById('postgresqlPort').value || '5432';
            let tmpUser = document.getElementById('postgresqlUser').value || 'postgres';
            tmpPreview1 = 'PostgreSQL on ' + tmpHost + ':' + tmpPort + ' as ' + tmpUser;
          } else if (tmpProvider === 'MongoDB') {
            let tmpHost = document.getElementById('mongodbHost').value || '127.0.0.1';
            let tmpPort = document.getElementById('mongodbPort').value || '27017';
            tmpPreview1 = 'MongoDB on ' + tmpHost + ':' + tmpPort;
          } else if (tmpProvider === 'Solr') {
            let tmpHost = document.getElementById('solrHost').value || '127.0.0.1';
            let tmpPort = document.getElementById('solrPort').value || '8983';
            tmpPreview1 = 'Solr on ' + tmpHost + ':' + tmpPort;
          } else if (tmpProvider === 'RocksDB') {
            let tmpFolder = document.getElementById('rocksdbFolder').value || 'data/rocksdb';
            tmpPreview1 = 'RocksDB at ' + tmpFolder;
          } else if (tmpProvider === 'Bibliograph') {
            let tmpFolder = document.getElementById('bibliographFolder').value || 'data/bibliograph';
            tmpPreview1 = 'Bibliograph at ' + tmpFolder;
          }
          document.getElementById('preview1').textContent = tmpPreview1;

          // Section 2 — Remote Session
          let tmpServerURL = document.getElementById('serverURL').value;
          let tmpUserName = document.getElementById('userName').value;
          if (tmpServerURL) {
            let tmpPreview2 = tmpServerURL;
            if (tmpUserName) tmpPreview2 += ' as ' + tmpUserName;
            document.getElementById('preview2').textContent = tmpPreview2;
          } else {
            document.getElementById('preview2').textContent = 'Configure remote server URL and credentials';
          }

          // Section 3 — Remote Schema
          let tmpTableChecks = document.querySelectorAll('#tableList input[type="checkbox"]:checked');
          if (tmpTableChecks.length > 0) {
            document.getElementById('preview3').textContent = tmpTableChecks.length + ' table' + (tmpTableChecks.length === 1 ? '' : 's') + ' selected';
          } else {
            let tmpSchemaURL = document.getElementById('schemaURL').value;
            if (tmpSchemaURL) {
              document.getElementById('preview3').textContent = 'Schema from ' + tmpSchemaURL;
            } else {
              document.getElementById('preview3').textContent = 'Fetch and select tables from the remote server';
            }
          }

          // Section 4 — Deploy Schema
          let tmpDeployedEl = document.getElementById('deployStatus');
          let tmpDeployedText = tmpDeployedEl ? tmpDeployedEl.textContent : '';
          if (tmpDeployedText && tmpDeployedText.indexOf('deployed') !== -1) {
            document.getElementById('preview4').textContent = tmpDeployedText;
          } else {
            document.getElementById('preview4').textContent = 'Create selected tables in the local database';
          }

          // Section 5 — Synchronize Data
          let tmpSyncMode = document.querySelector('input[name="syncMode"]:checked');
          let tmpModeName = tmpSyncMode ? tmpSyncMode.value : 'Initial';
          let tmpPageSize = document.getElementById('pageSize').value || '100';
          let tmpSyncPreview = tmpModeName + ' sync, page size ' + tmpPageSize;
          let tmpDeleted = document.getElementById('syncDeletedRecords').checked;
          if (tmpDeleted) tmpSyncPreview += ', including deleted';
          document.getElementById('preview5').textContent = tmpSyncPreview;

          // Section 6 — Export Configuration
          let tmpMaxRecords = document.getElementById('exportMaxRecords').value;
          let tmpLogFile = document.getElementById('exportLogFile').checked;
          let tmpExportParts = [];
          if (tmpMaxRecords && parseInt(tmpMaxRecords, 10) > 0) tmpExportParts.push('max ' + tmpMaxRecords + ' records');
          if (tmpLogFile) tmpExportParts.push('log enabled');else tmpExportParts.push('log disabled');
          document.getElementById('preview6').textContent = tmpExportParts.length > 0 ? 'Export: ' + tmpExportParts.join(', ') : 'Generate JSON config for headless cloning';

          // Section 7 — View Data
          let tmpViewTable = document.getElementById('viewTable').value;
          if (tmpViewTable) {
            document.getElementById('preview7').textContent = 'Viewing ' + tmpViewTable;
          } else {
            document.getElementById('preview7').textContent = 'Browse synced table data';
          }
        }
        initAccordionPreviews() {
          let tmpSelf = this;
          let tmpPreviewFields = ['connProvider', 'sqliteFilePath', 'mysqlServer', 'mysqlPort', 'mysqlUser', 'mssqlServer', 'mssqlPort', 'mssqlUser', 'postgresqlHost', 'postgresqlPort', 'postgresqlUser', 'mongodbHost', 'mongodbPort', 'solrHost', 'solrPort', 'rocksdbFolder', 'bibliographFolder', 'serverURL', 'userName', 'schemaURL', 'pageSize', 'dateTimePrecisionMS', 'exportMaxRecords', 'viewTable', 'viewLimit'];
          let tmpHandler = function () {
            tmpSelf.updateAllPreviews();
          };
          for (let i = 0; i < tmpPreviewFields.length; i++) {
            let tmpEl = document.getElementById(tmpPreviewFields[i]);
            if (tmpEl) {
              tmpEl.addEventListener('input', tmpHandler);
              tmpEl.addEventListener('change', tmpHandler);
            }
          }

          // Checkboxes and radios
          let tmpCheckboxes = ['syncDeletedRecords', 'exportLogFile'];
          for (let i = 0; i < tmpCheckboxes.length; i++) {
            let tmpEl = document.getElementById(tmpCheckboxes[i]);
            if (tmpEl) tmpEl.addEventListener('change', tmpHandler);
          }
          document.querySelectorAll('input[name="syncMode"]').forEach(function (pEl) {
            pEl.addEventListener('change', tmpHandler);
          });
        }

        // ================================================================
        // LocalStorage Persistence
        // ================================================================

        saveField(pFieldId) {
          let tmpEl = document.getElementById(pFieldId);
          if (tmpEl) {
            localStorage.setItem('dataCloner_' + pFieldId, tmpEl.value);
          }
        }
        restoreFields() {
          let tmpPersistFields = this.pict.AppData.DataCloner.PersistFields;
          for (let i = 0; i < tmpPersistFields.length; i++) {
            let tmpId = tmpPersistFields[i];
            let tmpSaved = localStorage.getItem('dataCloner_' + tmpId);
            if (tmpSaved !== null) {
              let tmpEl = document.getElementById(tmpId);
              if (tmpEl) tmpEl.value = tmpSaved;
            }
          }

          // Restore checkbox state
          let tmpSyncDeleted = localStorage.getItem('dataCloner_syncDeletedRecords');
          if (tmpSyncDeleted !== null) {
            document.getElementById('syncDeletedRecords').checked = tmpSyncDeleted === 'true';
          }
          // Restore sync mode
          let tmpSyncMode = localStorage.getItem('dataCloner_syncMode');
          if (tmpSyncMode === 'Ongoing') {
            document.getElementById('syncModeOngoing').checked = true;
          }
          let tmpSolrSecure = localStorage.getItem('dataCloner_solrSecure');
          if (tmpSolrSecure !== null) {
            document.getElementById('solrSecure').checked = tmpSolrSecure === 'true';
          }
        }
        initPersistence() {
          let tmpSelf = this;
          this.restoreFields();
          let tmpPersistFields = this.pict.AppData.DataCloner.PersistFields;
          for (let i = 0; i < tmpPersistFields.length; i++) {
            (function (pId) {
              let tmpEl = document.getElementById(pId);
              if (tmpEl) {
                tmpEl.addEventListener('input', function () {
                  tmpSelf.saveField(pId);
                });
                tmpEl.addEventListener('change', function () {
                  tmpSelf.saveField(pId);
                });
              }
            })(tmpPersistFields[i]);
          }

          // Persist sync deleted checkbox
          let tmpSyncDeletedEl = document.getElementById('syncDeletedRecords');
          if (tmpSyncDeletedEl) {
            tmpSyncDeletedEl.addEventListener('change', function () {
              localStorage.setItem('dataCloner_syncDeletedRecords', this.checked);
            });
          }

          // Persist sync mode radio
          document.querySelectorAll('input[name="syncMode"]').forEach(function (pEl) {
            pEl.addEventListener('change', function () {
              localStorage.setItem('dataCloner_syncMode', this.value);
            });
          });

          // Persist solr secure checkbox
          let tmpSolrSecureEl = document.getElementById('solrSecure');
          if (tmpSolrSecureEl) {
            tmpSolrSecureEl.addEventListener('change', function () {
              localStorage.setItem('dataCloner_solrSecure', this.checked);
            });
          }

          // Persist auto-process checkboxes
          let tmpAutoIds = ['auto1', 'auto2', 'auto3', 'auto4', 'auto5'];
          for (let a = 0; a < tmpAutoIds.length; a++) {
            (function (pId) {
              let tmpEl = document.getElementById(pId);
              if (tmpEl) {
                let tmpSaved = localStorage.getItem('dataCloner_' + pId);
                if (tmpSaved !== null) tmpEl.checked = tmpSaved === 'true';
                tmpEl.addEventListener('change', function () {
                  localStorage.setItem('dataCloner_' + pId, this.checked);
                });
              }
            })(tmpAutoIds[a]);
          }
        }

        // ================================================================
        // Live Status Indicator
        // ================================================================

        startLiveStatusPolling() {
          let tmpAppData = this.pict.AppData.DataCloner;
          if (tmpAppData.LiveStatusTimer) clearInterval(tmpAppData.LiveStatusTimer);
          this.pollLiveStatus();
          let tmpSelf = this;
          tmpAppData.LiveStatusTimer = setInterval(function () {
            tmpSelf.pollLiveStatus();
          }, 1500);
        }
        pollLiveStatus() {
          let tmpSelf = this;
          this.api('GET', '/clone/sync/live-status').then(function (pData) {
            tmpSelf.renderLiveStatus(pData);
          }).catch(function () {
            tmpSelf.renderLiveStatus({
              Phase: 'disconnected',
              Message: 'Cannot reach server',
              TotalSynced: 0,
              TotalRecords: 0
            });
          });
        }
        renderLiveStatus(pData) {
          let tmpBar = document.getElementById('liveStatusBar');
          let tmpMsg = document.getElementById('liveStatusMessage');
          let tmpMeta = document.getElementById('liveStatusMeta');
          let tmpProgressFill = document.getElementById('liveStatusProgressFill');
          if (!tmpBar) return;

          // Update phase class
          tmpBar.className = 'live-status-bar phase-' + (pData.Phase || 'idle');

          // Update message
          tmpMsg.textContent = pData.Message || 'Idle';

          // Update meta info
          let tmpMetaParts = [];
          if (pData.Phase === 'syncing' || pData.Phase === 'stopping') {
            if (pData.Elapsed) {
              tmpMetaParts.push('<span class="live-status-meta-item">\u23F1 ' + pData.Elapsed + '</span>');
            }
            if (pData.ETA) {
              tmpMetaParts.push('<span class="live-status-meta-item">~' + pData.ETA + ' remaining</span>');
            }
            if (pData.TotalTables > 0) {
              tmpMetaParts.push('<span class="live-status-meta-item"><strong>' + pData.Completed + '</strong> / ' + pData.TotalTables + ' tables</span>');
            }
            if (pData.TotalSynced > 0) {
              let tmpSynced = pData.TotalSynced.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
              if (pData.PreCountGrandTotal > 0) {
                let tmpGrandTotal = pData.PreCountGrandTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                tmpMetaParts.push('<span class="live-status-meta-item"><strong>' + tmpSynced + '</strong> / ' + tmpGrandTotal + ' records</span>');
              } else {
                tmpMetaParts.push('<span class="live-status-meta-item"><strong>' + tmpSynced + '</strong> records</span>');
              }
            } else if (pData.PreCountGrandTotal > 0) {
              let tmpGrandTotal = pData.PreCountGrandTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
              tmpMetaParts.push('<span class="live-status-meta-item">' + tmpGrandTotal + ' records to sync</span>');
            }
            if (pData.PreCountProgress && pData.PreCountProgress.Counted < pData.PreCountProgress.TotalTables) {
              tmpMetaParts.push('<span class="live-status-meta-item">counting: ' + pData.PreCountProgress.Counted + ' / ' + pData.PreCountProgress.TotalTables + '</span>');
            }
            if (pData.Errors > 0) {
              tmpMetaParts.push('<span class="live-status-meta-item" style="color:#dc3545"><strong>' + pData.Errors + '</strong> error' + (pData.Errors === 1 ? '' : 's') + '</span>');
            }
          } else if (pData.Phase === 'complete') {
            if (pData.TotalSynced > 0) {
              let tmpSynced = pData.TotalSynced.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
              tmpMetaParts.push('<span class="live-status-meta-item"><strong>' + tmpSynced + '</strong> records synced</span>');
            }
          }
          tmpMeta.innerHTML = tmpMetaParts.join('');

          // Update progress bar
          let tmpPct = 0;
          if (pData.Phase === 'syncing' && pData.PreCountGrandTotal > 0 && pData.TotalSynced > 0) {
            tmpPct = Math.min(pData.TotalSynced / pData.PreCountGrandTotal * 100, 99.9);
          } else if (pData.Phase === 'syncing' && pData.TotalTables > 0) {
            let tmpTablePct = pData.Completed / pData.TotalTables * 100;
            if (pData.ActiveProgress && pData.ActiveProgress.Total > 0) {
              let tmpEntityPct = pData.ActiveProgress.Synced / pData.ActiveProgress.Total * (100 / pData.TotalTables);
              tmpPct = tmpTablePct + tmpEntityPct;
            } else {
              tmpPct = tmpTablePct;
            }
          } else if (pData.Phase === 'complete') {
            tmpPct = 100;
          }
          tmpProgressFill.style.width = Math.min(100, Math.round(tmpPct)) + '%';
        }

        // ================================================================
        // Deployed Tables Persistence
        // ================================================================

        saveDeployedTables() {
          localStorage.setItem('dataCloner_deployedTables', JSON.stringify(this.pict.AppData.DataCloner.DeployedTables));
        }
        restoreDeployedTables() {
          try {
            let tmpRaw = localStorage.getItem('dataCloner_deployedTables');
            if (tmpRaw) {
              this.pict.AppData.DataCloner.DeployedTables = JSON.parse(tmpRaw);
              this.pict.views['DataCloner-ViewData'].populateViewTableDropdown();
            }
          } catch (pError) {/* ignore */}
        }

        // ================================================================
        // Auto-Process
        // ================================================================

        initAutoProcess() {
          let tmpSelf = this;
          this.api('GET', '/clone/sync/live-status').then(function (pData) {
            if (pData.Phase === 'syncing' || pData.Phase === 'stopping') {
              tmpSelf.pict.AppData.DataCloner.ServerBusyAtLoad = true;
              tmpSelf.setSectionPhase(5, 'busy');
              tmpSelf.pict.views['DataCloner-Sync'].startPolling();
              return;
            }
            tmpSelf.runAutoProcessChain();
          }).catch(function () {
            // Server unreachable — don't auto-process
          });
        }
        runAutoProcessChain() {
          let tmpSelf = this;
          let tmpDelay = 0;
          let tmpStepDelay = 2000;
          if (document.getElementById('auto1') && document.getElementById('auto1').checked) {
            setTimeout(function () {
              tmpSelf.pict.views['DataCloner-Connection'].connectProvider();
            }, tmpDelay);
            tmpDelay += tmpStepDelay;
          }
          if (document.getElementById('auto2') && document.getElementById('auto2').checked) {
            setTimeout(function () {
              tmpSelf.pict.views['DataCloner-Session'].goAction();
            }, tmpDelay);
            tmpDelay += tmpStepDelay + 1500;
          }
          if (document.getElementById('auto3') && document.getElementById('auto3').checked) {
            setTimeout(function () {
              tmpSelf.pict.views['DataCloner-Schema'].fetchSchema();
            }, tmpDelay);
            tmpDelay += tmpStepDelay;
          }
          if (document.getElementById('auto4') && document.getElementById('auto4').checked) {
            setTimeout(function () {
              tmpSelf.pict.views['DataCloner-Deploy'].deploySchema();
            }, tmpDelay);
            tmpDelay += tmpStepDelay;
          }
          if (document.getElementById('auto5') && document.getElementById('auto5').checked) {
            setTimeout(function () {
              tmpSelf.pict.views['DataCloner-Sync'].startSync();
            }, tmpDelay);
          }
        }
      }
      module.exports = DataClonerProvider;
      module.exports.default_configuration = {
        ProviderIdentifier: 'DataCloner',
        AutoInitialize: true,
        AutoInitializeOrdinal: 0
      };
    }, {
      "pict-provider": 6
    }],
    13: [function (require, module, exports) {
      const libPictView = require('pict-view');
      class DataClonerConnectionView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        onProviderChange() {
          let tmpProvider = document.getElementById('connProvider').value;
          let tmpProviders = ['SQLite', 'MySQL', 'MSSQL', 'PostgreSQL', 'Solr', 'MongoDB', 'RocksDB', 'Bibliograph'];
          for (let i = 0; i < tmpProviders.length; i++) {
            let tmpEl = document.getElementById('config' + tmpProviders[i]);
            if (tmpEl) {
              tmpEl.style.display = tmpProvider === tmpProviders[i] ? '' : 'none';
            }
          }
          this.pict.providers.DataCloner.saveField('connProvider');
        }
        getProviderConfig() {
          let tmpProvider = document.getElementById('connProvider').value;
          let tmpConfig = {};
          if (tmpProvider === 'SQLite') {
            tmpConfig.SQLiteFilePath = document.getElementById('sqliteFilePath').value.trim() || 'data/cloned.sqlite';
          } else if (tmpProvider === 'MySQL') {
            tmpConfig.host = document.getElementById('mysqlServer').value.trim() || '127.0.0.1';
            tmpConfig.port = parseInt(document.getElementById('mysqlPort').value, 10) || 3306;
            tmpConfig.user = document.getElementById('mysqlUser').value.trim() || 'root';
            tmpConfig.password = document.getElementById('mysqlPassword').value;
            tmpConfig.database = document.getElementById('mysqlDatabase').value.trim();
            tmpConfig.connectionLimit = parseInt(document.getElementById('mysqlConnectionLimit').value, 10) || 20;
          } else if (tmpProvider === 'MSSQL') {
            tmpConfig.server = document.getElementById('mssqlServer').value.trim() || '127.0.0.1';
            tmpConfig.port = parseInt(document.getElementById('mssqlPort').value, 10) || 1433;
            tmpConfig.user = document.getElementById('mssqlUser').value.trim() || 'sa';
            tmpConfig.password = document.getElementById('mssqlPassword').value;
            tmpConfig.database = document.getElementById('mssqlDatabase').value.trim();
            tmpConfig.connectionLimit = parseInt(document.getElementById('mssqlConnectionLimit').value, 10) || 20;
          } else if (tmpProvider === 'PostgreSQL') {
            tmpConfig.host = document.getElementById('postgresqlHost').value.trim() || '127.0.0.1';
            tmpConfig.port = parseInt(document.getElementById('postgresqlPort').value, 10) || 5432;
            tmpConfig.user = document.getElementById('postgresqlUser').value.trim() || 'postgres';
            tmpConfig.password = document.getElementById('postgresqlPassword').value;
            tmpConfig.database = document.getElementById('postgresqlDatabase').value.trim();
            tmpConfig.max = parseInt(document.getElementById('postgresqlConnectionLimit').value, 10) || 10;
          } else if (tmpProvider === 'Solr') {
            tmpConfig.host = document.getElementById('solrHost').value.trim() || 'localhost';
            tmpConfig.port = parseInt(document.getElementById('solrPort').value, 10) || 8983;
            tmpConfig.core = document.getElementById('solrCore').value.trim() || 'default';
            tmpConfig.path = document.getElementById('solrPath').value.trim() || '/solr';
            tmpConfig.secure = document.getElementById('solrSecure').checked;
          } else if (tmpProvider === 'MongoDB') {
            tmpConfig.host = document.getElementById('mongodbHost').value.trim() || '127.0.0.1';
            tmpConfig.port = parseInt(document.getElementById('mongodbPort').value, 10) || 27017;
            tmpConfig.user = document.getElementById('mongodbUser').value.trim();
            tmpConfig.password = document.getElementById('mongodbPassword').value;
            tmpConfig.database = document.getElementById('mongodbDatabase').value.trim() || 'test';
            tmpConfig.maxPoolSize = parseInt(document.getElementById('mongodbConnectionLimit').value, 10) || 10;
          } else if (tmpProvider === 'RocksDB') {
            tmpConfig.RocksDBFolder = document.getElementById('rocksdbFolder').value.trim() || 'data/rocksdb';
          } else if (tmpProvider === 'Bibliograph') {
            tmpConfig.StorageFolder = document.getElementById('bibliographFolder').value.trim() || 'data/bibliograph';
          }
          return {
            Provider: tmpProvider,
            Config: tmpConfig
          };
        }
        connectProvider() {
          let tmpConnInfo = this.getProviderConfig();
          this.pict.providers.DataCloner.setSectionPhase(1, 'busy');
          this.pict.providers.DataCloner.setStatus('connectionStatus', 'Connecting to ' + tmpConnInfo.Provider + '...', 'info');
          this.pict.providers.DataCloner.api('POST', '/clone/connection/configure', tmpConnInfo).then(pData => {
            if (pData.Success) {
              this.pict.providers.DataCloner.setStatus('connectionStatus', pData.Message, 'ok');
              this.pict.providers.DataCloner.setSectionPhase(1, 'ok');
            } else {
              this.pict.providers.DataCloner.setStatus('connectionStatus', 'Connection failed: ' + (pData.Error || 'Unknown error'), 'error');
              this.pict.providers.DataCloner.setSectionPhase(1, 'error');
            }
          }).catch(pError => {
            this.pict.providers.DataCloner.setStatus('connectionStatus', 'Request failed: ' + pError.message, 'error');
            this.pict.providers.DataCloner.setSectionPhase(1, 'error');
          });
        }
        testConnection() {
          let tmpConnInfo = this.getProviderConfig();
          this.pict.providers.DataCloner.setStatus('connectionStatus', 'Testing ' + tmpConnInfo.Provider + ' connection...', 'info');
          this.pict.providers.DataCloner.api('POST', '/clone/connection/test', tmpConnInfo).then(pData => {
            if (pData.Success) {
              this.pict.providers.DataCloner.setStatus('connectionStatus', pData.Message, 'ok');
            } else {
              this.pict.providers.DataCloner.setStatus('connectionStatus', 'Test failed: ' + (pData.Error || 'Unknown error'), 'error');
            }
          }).catch(pError => {
            this.pict.providers.DataCloner.setStatus('connectionStatus', 'Request failed: ' + pError.message, 'error');
          });
        }
        checkConnectionStatus() {
          this.pict.providers.DataCloner.api('GET', '/clone/connection/status').then(pData => {
            if (pData.Connected) {
              this.pict.providers.DataCloner.setStatus('connectionStatus', 'Connected: ' + pData.Provider, 'ok');
              this.pict.providers.DataCloner.setSectionPhase(1, 'ok');
            }
          }).catch(() => {
            /* ignore */
          });
        }
      }
      module.exports = DataClonerConnectionView;
      module.exports.default_configuration = {
        ViewIdentifier: 'DataCloner-Connection',
        DefaultRenderable: 'DataCloner-Connection',
        DefaultDestinationAddress: '#DataCloner-Section-Connection',
        Templates: [{
          Hash: 'DataCloner-Connection',
          Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">1</div>
	<div class="accordion-card" id="section1" data-section="1">
		<div class="accordion-header" onclick="pict.views['DataCloner-Layout'].toggleSection('section1')">
			<div class="accordion-title">Database Connection</div>
			<span class="accordion-phase" id="phase1"></span>
			<div class="accordion-preview" id="preview1">SQLite at data/cloned.sqlite</div>
			<div class="accordion-actions">
				<span class="accordion-go" onclick="event.stopPropagation(); pict.views['DataCloner-Connection'].connectProvider()">go</span>
				<label class="accordion-auto" onclick="event.stopPropagation()"><input type="checkbox" id="auto1"> <span class="auto-label">auto</span></label>
			</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<p style="font-size:0.9em; color:#666; margin-bottom:10px">Configure the local database where cloned data will be stored. SQLite is connected by default.</p>

			<div class="inline-group">
				<div style="flex:0 0 200px">
					<label for="connProvider">Provider</label>
					<select id="connProvider" onchange="pict.views['DataCloner-Connection'].onProviderChange()">
						<option value="SQLite" selected>SQLite</option>
						<option value="MySQL">MySQL</option>
						<option value="MSSQL">MSSQL</option>
						<option value="PostgreSQL">PostgreSQL</option>
						<option value="Solr">Solr</option>
						<option value="MongoDB">MongoDB</option>
						<option value="RocksDB">RocksDB</option>
						<option value="Bibliograph">Bibliograph</option>
					</select>
				</div>
				<div style="flex:1; display:flex; align-items:flex-end; gap:8px">
					<button class="primary" onclick="pict.views['DataCloner-Connection'].connectProvider()">Connect</button>
					<button class="secondary" onclick="pict.views['DataCloner-Connection'].testConnection()">Test Connection</button>
				</div>
			</div>

			<!-- SQLite Config -->
			<div id="configSQLite">
				<label for="sqliteFilePath">SQLite File Path</label>
				<input type="text" id="sqliteFilePath" placeholder="data/cloned.sqlite" value="data/cloned.sqlite">
			</div>

			<!-- MySQL Config -->
			<div id="configMySQL" style="display:none">
				<div class="inline-group">
					<div style="flex:2">
						<label for="mysqlServer">Server</label>
						<input type="text" id="mysqlServer" placeholder="127.0.0.1" value="127.0.0.1">
					</div>
					<div style="flex:1">
						<label for="mysqlPort">Port</label>
						<input type="number" id="mysqlPort" placeholder="3306" value="3306">
					</div>
				</div>
				<div class="inline-group">
					<div>
						<label for="mysqlUser">User</label>
						<input type="text" id="mysqlUser" placeholder="root" value="root">
					</div>
					<div>
						<label for="mysqlPassword">Password</label>
						<input type="password" id="mysqlPassword" placeholder="password">
					</div>
				</div>
				<label for="mysqlDatabase">Database</label>
				<input type="text" id="mysqlDatabase" placeholder="meadow_clone">
				<div class="inline-group">
					<div>
						<label for="mysqlConnectionLimit">Connection Limit</label>
						<input type="number" id="mysqlConnectionLimit" placeholder="20" value="20">
					</div>
					<div></div>
				</div>
			</div>

			<!-- MSSQL Config -->
			<div id="configMSSQL" style="display:none">
				<div class="inline-group">
					<div style="flex:2">
						<label for="mssqlServer">Server</label>
						<input type="text" id="mssqlServer" placeholder="127.0.0.1" value="127.0.0.1">
					</div>
					<div style="flex:1">
						<label for="mssqlPort">Port</label>
						<input type="number" id="mssqlPort" placeholder="1433" value="1433">
					</div>
				</div>
				<div class="inline-group">
					<div>
						<label for="mssqlUser">User</label>
						<input type="text" id="mssqlUser" placeholder="sa" value="sa">
					</div>
					<div>
						<label for="mssqlPassword">Password</label>
						<input type="password" id="mssqlPassword" placeholder="password">
					</div>
				</div>
				<label for="mssqlDatabase">Database</label>
				<input type="text" id="mssqlDatabase" placeholder="meadow_clone">
				<div class="inline-group">
					<div>
						<label for="mssqlConnectionLimit">Connection Limit</label>
						<input type="number" id="mssqlConnectionLimit" placeholder="20" value="20">
					</div>
					<div></div>
				</div>
			</div>

			<!-- PostgreSQL Config -->
			<div id="configPostgreSQL" style="display:none">
				<div class="inline-group">
					<div style="flex:2">
						<label for="postgresqlHost">Host</label>
						<input type="text" id="postgresqlHost" placeholder="127.0.0.1" value="127.0.0.1">
					</div>
					<div style="flex:1">
						<label for="postgresqlPort">Port</label>
						<input type="number" id="postgresqlPort" placeholder="5432" value="5432">
					</div>
				</div>
				<div class="inline-group">
					<div>
						<label for="postgresqlUser">User</label>
						<input type="text" id="postgresqlUser" placeholder="postgres" value="postgres">
					</div>
					<div>
						<label for="postgresqlPassword">Password</label>
						<input type="password" id="postgresqlPassword" placeholder="password">
					</div>
				</div>
				<label for="postgresqlDatabase">Database</label>
				<input type="text" id="postgresqlDatabase" placeholder="meadow_clone">
				<div class="inline-group">
					<div>
						<label for="postgresqlConnectionLimit">Connection Pool Limit</label>
						<input type="number" id="postgresqlConnectionLimit" placeholder="10" value="10">
					</div>
					<div></div>
				</div>
			</div>

			<!-- Solr Config -->
			<div id="configSolr" style="display:none">
				<div class="inline-group">
					<div style="flex:2">
						<label for="solrHost">Host</label>
						<input type="text" id="solrHost" placeholder="localhost" value="localhost">
					</div>
					<div style="flex:1">
						<label for="solrPort">Port</label>
						<input type="number" id="solrPort" placeholder="8983" value="8983">
					</div>
				</div>
				<div class="inline-group">
					<div style="flex:2">
						<label for="solrCore">Core</label>
						<input type="text" id="solrCore" placeholder="default" value="default">
					</div>
					<div style="flex:1">
						<label for="solrPath">Path</label>
						<input type="text" id="solrPath" placeholder="/solr" value="/solr">
					</div>
				</div>
				<div class="checkbox-row">
					<input type="checkbox" id="solrSecure">
					<label for="solrSecure">Use HTTPS</label>
				</div>
			</div>

			<!-- MongoDB Config -->
			<div id="configMongoDB" style="display:none">
				<div class="inline-group">
					<div style="flex:2">
						<label for="mongodbHost">Host</label>
						<input type="text" id="mongodbHost" placeholder="127.0.0.1" value="127.0.0.1">
					</div>
					<div style="flex:1">
						<label for="mongodbPort">Port</label>
						<input type="number" id="mongodbPort" placeholder="27017" value="27017">
					</div>
				</div>
				<div class="inline-group">
					<div>
						<label for="mongodbUser">User</label>
						<input type="text" id="mongodbUser" placeholder="(optional)">
					</div>
					<div>
						<label for="mongodbPassword">Password</label>
						<input type="password" id="mongodbPassword" placeholder="(optional)">
					</div>
				</div>
				<label for="mongodbDatabase">Database</label>
				<input type="text" id="mongodbDatabase" placeholder="test" value="test">
				<div class="inline-group">
					<div>
						<label for="mongodbConnectionLimit">Max Pool Size</label>
						<input type="number" id="mongodbConnectionLimit" placeholder="10" value="10">
					</div>
					<div></div>
				</div>
			</div>

			<!-- RocksDB Config -->
			<div id="configRocksDB" style="display:none">
				<label for="rocksdbFolder">RocksDB Folder Path</label>
				<input type="text" id="rocksdbFolder" placeholder="data/rocksdb" value="data/rocksdb">
			</div>

			<!-- Bibliograph Config -->
			<div id="configBibliograph" style="display:none">
				<label for="bibliographFolder">Storage Folder Path</label>
				<input type="text" id="bibliographFolder" placeholder="data/bibliograph" value="data/bibliograph">
			</div>

			<div id="connectionStatus"></div>
		</div>
	</div>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'DataCloner-Connection',
          TemplateHash: 'DataCloner-Connection',
          DestinationAddress: '#DataCloner-Section-Connection'
        }]
      };
    }, {
      "pict-view": 8
    }],
    14: [function (require, module, exports) {
      const libPictView = require('pict-view');
      class DataClonerDeployView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        deploySchema() {
          let tmpSelectedTables = this.pict.views['DataCloner-Schema'].getSelectedTables();
          if (tmpSelectedTables.length === 0) {
            this.pict.providers.DataCloner.setStatus('deployStatus', 'No tables selected. Fetch a schema and select tables first.', 'error');
            this.pict.providers.DataCloner.setSectionPhase(4, 'error');
            return;
          }
          this.pict.providers.DataCloner.setSectionPhase(4, 'busy');
          this.pict.providers.DataCloner.setStatus('deployStatus', 'Deploying ' + tmpSelectedTables.length + ' tables...', 'info');
          let tmpSelf = this;
          this.pict.providers.DataCloner.api('POST', '/clone/schema/deploy', {
            Tables: tmpSelectedTables
          }).then(function (pData) {
            if (pData.Success) {
              tmpSelf.pict.providers.DataCloner.setStatus('deployStatus', pData.Message, 'ok');
              tmpSelf.pict.providers.DataCloner.setSectionPhase(4, 'ok');
              tmpSelf.pict.AppData.DataCloner.DeployedTables = pData.TablesDeployed || tmpSelectedTables;
              tmpSelf.pict.providers.DataCloner.saveDeployedTables();
              tmpSelf.pict.views['DataCloner-ViewData'].populateViewTableDropdown();
              tmpSelf.pict.providers.DataCloner.updateAllPreviews();
            } else {
              tmpSelf.pict.providers.DataCloner.setStatus('deployStatus', 'Deploy failed: ' + (pData.Error || 'Unknown error'), 'error');
              tmpSelf.pict.providers.DataCloner.setSectionPhase(4, 'error');
            }
          }).catch(function (pError) {
            tmpSelf.pict.providers.DataCloner.setStatus('deployStatus', 'Request failed: ' + pError.message, 'error');
            tmpSelf.pict.providers.DataCloner.setSectionPhase(4, 'error');
          });
        }
        resetDatabase() {
          if (!confirm('This will delete ALL data in the local SQLite database. Continue?')) {
            return;
          }
          this.pict.providers.DataCloner.setStatus('deployStatus', 'Resetting database...', 'info');
          let tmpSelf = this;
          this.pict.providers.DataCloner.api('POST', '/clone/reset').then(function (pData) {
            if (pData.Success) {
              tmpSelf.pict.providers.DataCloner.setStatus('deployStatus', pData.Message, 'ok');
              // Clear the sync progress display
              let tmpSyncProgress = document.getElementById('syncProgress');
              if (tmpSyncProgress) tmpSyncProgress.innerHTML = '';
            } else {
              tmpSelf.pict.providers.DataCloner.setStatus('deployStatus', 'Reset failed: ' + (pData.Error || 'Unknown error'), 'error');
            }
          }).catch(function (pError) {
            tmpSelf.pict.providers.DataCloner.setStatus('deployStatus', 'Request failed: ' + pError.message, 'error');
          });
        }
      }
      module.exports = DataClonerDeployView;
      module.exports.default_configuration = {
        ViewIdentifier: 'DataCloner-Deploy',
        DefaultRenderable: 'DataCloner-Deploy',
        DefaultDestinationAddress: '#DataCloner-Section-Deploy',
        Templates: [{
          Hash: 'DataCloner-Deploy',
          Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">4</div>
	<div class="accordion-card" id="section4" data-section="4">
		<div class="accordion-header" onclick="pict.views['DataCloner-Layout'].toggleSection('section4')">
			<div class="accordion-title">Deploy Schema</div>
			<span class="accordion-phase" id="phase4"></span>
			<div class="accordion-preview" id="preview4">Create selected tables in the local database</div>
			<div class="accordion-actions">
				<span class="accordion-go" onclick="event.stopPropagation(); pict.views['DataCloner-Deploy'].deploySchema()">go</span>
				<label class="accordion-auto" onclick="event.stopPropagation()"><input type="checkbox" id="auto4"> <span class="auto-label">auto</span></label>
			</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<p style="font-size:0.9em; color:#666; margin-bottom:10px">Creates the selected tables in the local database and sets up CRUD endpoints (e.g. GET /1.0/Documents).</p>
			<button class="primary" onclick="pict.views['DataCloner-Deploy'].deploySchema()">Deploy Selected Tables</button>
			<button class="danger" onclick="pict.views['DataCloner-Deploy'].resetDatabase()">Reset Database</button>
			<div id="deployStatus"></div>
		</div>
	</div>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'DataCloner-Deploy',
          TemplateHash: 'DataCloner-Deploy',
          DestinationAddress: '#DataCloner-Section-Deploy'
        }]
      };
    }, {
      "pict-view": 8
    }],
    15: [function (require, module, exports) {
      const libPictView = require('pict-view');
      class DataClonerExportView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        buildConfigObject() {
          let tmpProvider = document.getElementById('connProvider').value;
          let tmpConfig = {};

          // ---- Local Database ----
          tmpConfig.LocalDatabase = {
            Provider: tmpProvider,
            Config: {}
          };
          let tmpDbConfig = tmpConfig.LocalDatabase.Config;
          if (tmpProvider === 'SQLite') {
            tmpDbConfig.SQLiteFilePath = document.getElementById('sqliteFilePath').value.trim() || 'data/cloned.sqlite';
          } else if (tmpProvider === 'MySQL') {
            tmpDbConfig.host = document.getElementById('mysqlServer').value.trim() || '127.0.0.1';
            tmpDbConfig.port = parseInt(document.getElementById('mysqlPort').value, 10) || 3306;
            tmpDbConfig.user = document.getElementById('mysqlUser').value.trim() || 'root';
            tmpDbConfig.password = document.getElementById('mysqlPassword').value;
            tmpDbConfig.database = document.getElementById('mysqlDatabase').value.trim();
            tmpDbConfig.connectionLimit = parseInt(document.getElementById('mysqlConnectionLimit').value, 10) || 20;
          } else if (tmpProvider === 'MSSQL') {
            tmpDbConfig.server = document.getElementById('mssqlServer').value.trim() || '127.0.0.1';
            tmpDbConfig.port = parseInt(document.getElementById('mssqlPort').value, 10) || 1433;
            tmpDbConfig.user = document.getElementById('mssqlUser').value.trim() || 'sa';
            tmpDbConfig.password = document.getElementById('mssqlPassword').value;
            tmpDbConfig.database = document.getElementById('mssqlDatabase').value.trim();
            tmpDbConfig.connectionLimit = parseInt(document.getElementById('mssqlConnectionLimit').value, 10) || 20;
          } else if (tmpProvider === 'PostgreSQL') {
            tmpDbConfig.host = document.getElementById('postgresqlHost').value.trim() || '127.0.0.1';
            tmpDbConfig.port = parseInt(document.getElementById('postgresqlPort').value, 10) || 5432;
            tmpDbConfig.user = document.getElementById('postgresqlUser').value.trim() || 'postgres';
            tmpDbConfig.password = document.getElementById('postgresqlPassword').value;
            tmpDbConfig.database = document.getElementById('postgresqlDatabase').value.trim();
            tmpDbConfig.max = parseInt(document.getElementById('postgresqlConnectionLimit').value, 10) || 10;
          }

          // ---- Remote Session ----
          tmpConfig.RemoteSession = {};
          let tmpServerURL = document.getElementById('serverURL').value.trim();
          if (tmpServerURL) tmpConfig.RemoteSession.ServerURL = tmpServerURL + '/1.0/';
          let tmpAuthMethod = document.getElementById('authMethod').value.trim();
          if (tmpAuthMethod) tmpConfig.RemoteSession.AuthenticationMethod = tmpAuthMethod;
          let tmpAuthURI = document.getElementById('authURI').value.trim();
          if (tmpAuthURI) tmpConfig.RemoteSession.AuthenticationURITemplate = tmpAuthURI;
          let tmpCheckURI = document.getElementById('checkURI').value.trim();
          if (tmpCheckURI) tmpConfig.RemoteSession.CheckSessionURITemplate = tmpCheckURI;
          let tmpCookieName = document.getElementById('cookieName').value.trim();
          if (tmpCookieName) tmpConfig.RemoteSession.CookieName = tmpCookieName;
          let tmpCookieValueAddr = document.getElementById('cookieValueAddr').value.trim();
          if (tmpCookieValueAddr) tmpConfig.RemoteSession.CookieValueAddress = tmpCookieValueAddr;
          let tmpCookieValueTemplate = document.getElementById('cookieValueTemplate').value.trim();
          if (tmpCookieValueTemplate) tmpConfig.RemoteSession.CookieValueTemplate = tmpCookieValueTemplate;
          let tmpLoginMarker = document.getElementById('loginMarker').value.trim();
          if (tmpLoginMarker) tmpConfig.RemoteSession.CheckSessionLoginMarker = tmpLoginMarker;

          // ---- Credentials ----
          let tmpUserName = document.getElementById('userName').value.trim();
          let tmpPassword = document.getElementById('password').value;
          if (tmpUserName || tmpPassword) {
            tmpConfig.Credentials = {};
            if (tmpUserName) tmpConfig.Credentials.UserName = tmpUserName;
            if (tmpPassword) tmpConfig.Credentials.Password = tmpPassword;
          }

          // ---- Schema ----
          let tmpSchemaURL = document.getElementById('schemaURL').value.trim();
          if (tmpSchemaURL) tmpConfig.SchemaURL = tmpSchemaURL;

          // ---- Tables ----
          let tmpSelectedTables = this.pict.views['DataCloner-Schema'].getSelectedTables();
          if (tmpSelectedTables.length > 0) tmpConfig.Tables = tmpSelectedTables;

          // ---- Sync Options ----
          tmpConfig.Sync = {};
          tmpConfig.Sync.Mode = document.querySelector('input[name="syncMode"]:checked').value;
          tmpConfig.Sync.PageSize = parseInt(document.getElementById('pageSize').value, 10) || 100;
          tmpConfig.Sync.SyncDeletedRecords = document.getElementById('syncDeletedRecords').checked;
          let tmpPrecision = parseInt(document.getElementById('dateTimePrecisionMS').value, 10);
          if (!isNaN(tmpPrecision) && tmpPrecision !== 1000) tmpConfig.Sync.DateTimePrecisionMS = tmpPrecision;
          let tmpMaxRecords = parseInt(document.getElementById('exportMaxRecords').value, 10);
          if (tmpMaxRecords > 0) tmpConfig.Sync.MaxRecords = tmpMaxRecords;
          return tmpConfig;
        }
        buildMeadowIntegrationConfig() {
          let tmpProvider = document.getElementById('connProvider').value;
          let tmpConfig = {};

          // ---- Source ----
          let tmpServerURL = document.getElementById('serverURL').value.trim();
          tmpConfig.Source = {
            ServerURL: tmpServerURL ? tmpServerURL + '/1.0/' : 'https://localhost:8080/1.0/'
          };
          // When SessionManager handles auth, Source credentials are not needed
          tmpConfig.Source.UserID = false;
          tmpConfig.Source.Password = false;

          // ---- Destination ----
          // meadow-integration clone supports MySQL and MSSQL
          tmpConfig.Destination = {};
          if (tmpProvider === 'MySQL') {
            tmpConfig.Destination.Provider = 'MySQL';
            tmpConfig.Destination.MySQL = {};
            tmpConfig.Destination.MySQL.server = document.getElementById('mysqlServer').value.trim() || '127.0.0.1';
            tmpConfig.Destination.MySQL.port = parseInt(document.getElementById('mysqlPort').value, 10) || 3306;
            tmpConfig.Destination.MySQL.user = document.getElementById('mysqlUser').value.trim() || 'root';
            tmpConfig.Destination.MySQL.password = document.getElementById('mysqlPassword').value || '';
            tmpConfig.Destination.MySQL.database = document.getElementById('mysqlDatabase').value.trim() || 'meadow';
            tmpConfig.Destination.MySQL.connectionLimit = parseInt(document.getElementById('mysqlConnectionLimit').value, 10) || 20;
          } else if (tmpProvider === 'MSSQL') {
            tmpConfig.Destination.Provider = 'MSSQL';
            tmpConfig.Destination.MSSQL = {};
            tmpConfig.Destination.MSSQL.server = document.getElementById('mssqlServer').value.trim() || '127.0.0.1';
            tmpConfig.Destination.MSSQL.port = parseInt(document.getElementById('mssqlPort').value, 10) || 1433;
            tmpConfig.Destination.MSSQL.user = document.getElementById('mssqlUser').value.trim() || 'sa';
            tmpConfig.Destination.MSSQL.password = document.getElementById('mssqlPassword').value || '';
            tmpConfig.Destination.MSSQL.database = document.getElementById('mssqlDatabase').value.trim() || 'meadow';
            tmpConfig.Destination.MSSQL.ConnectionPoolLimit = parseInt(document.getElementById('mssqlConnectionLimit').value, 10) || 20;
          } else {
            // Default to MySQL placeholder for unsupported providers
            tmpConfig.Destination.Provider = 'MySQL';
            tmpConfig.Destination.MySQL = {
              server: '127.0.0.1',
              port: 3306,
              user: 'root',
              password: '',
              database: 'meadow',
              connectionLimit: 20
            };
          }

          // ---- Schema ----
          let tmpSchemaURL = document.getElementById('schemaURL').value.trim();
          if (tmpSchemaURL) {
            tmpConfig.SchemaURL = tmpSchemaURL;
          } else {
            tmpConfig.SchemaPath = './schema/Model-Extended.json';
          }

          // ---- Sync ----
          tmpConfig.Sync = {};
          tmpConfig.Sync.DefaultSyncMode = document.querySelector('input[name="syncMode"]:checked').value;
          tmpConfig.Sync.PageSize = parseInt(document.getElementById('pageSize').value, 10) || 100;
          let tmpMdwintPrecision = parseInt(document.getElementById('dateTimePrecisionMS').value, 10);
          if (!isNaN(tmpMdwintPrecision)) tmpConfig.Sync.DateTimePrecisionMS = tmpMdwintPrecision;
          let tmpSelectedTables = this.pict.views['DataCloner-Schema'].getSelectedTables();
          tmpConfig.Sync.SyncEntityList = tmpSelectedTables.length > 0 ? tmpSelectedTables : [];
          tmpConfig.Sync.SyncEntityOptions = {};

          // ---- SessionManager ----
          tmpConfig.SessionManager = {
            Sessions: {}
          };
          let tmpSessionConfig = {};
          tmpSessionConfig.Type = 'Cookie';

          // Authentication method
          let tmpAuthMethod = document.getElementById('authMethod').value.trim() || 'get';
          tmpSessionConfig.AuthenticationMethod = tmpAuthMethod;

          // Build the authentication URI template
          let tmpAuthURI = document.getElementById('authURI').value.trim();
          if (tmpAuthURI) {
            // If the URI is a relative path, prepend the server URL
            if (tmpAuthURI.charAt(0) === '/') {
              tmpSessionConfig.AuthenticationURITemplate = (tmpServerURL || '') + tmpAuthURI;
            } else {
              tmpSessionConfig.AuthenticationURITemplate = tmpAuthURI;
            }
          } else if (tmpServerURL) {
            // Default: Meadow-style GET authentication
            if (tmpAuthMethod === 'post') {
              tmpSessionConfig.AuthenticationURITemplate = tmpServerURL + '/1.0/Authenticate';
              tmpSessionConfig.AuthenticationRequestBody = {
                UserName: '{~D:Record.UserName~}',
                Password: '{~D:Record.Password~}'
              };
            } else {
              tmpSessionConfig.AuthenticationURITemplate = tmpServerURL + '/1.0/Authenticate/{~D:Record.UserName~}/{~D:Record.Password~}';
            }
          }

          // Check session URI
          let tmpCheckURI = document.getElementById('checkURI').value.trim();
          if (tmpCheckURI) {
            tmpSessionConfig.CheckSessionURITemplate = tmpCheckURI.charAt(0) === '/' ? (tmpServerURL || '') + tmpCheckURI : tmpCheckURI;
          } else if (tmpServerURL) {
            tmpSessionConfig.CheckSessionURITemplate = tmpServerURL + '/1.0/CheckSession';
          }

          // Login marker
          let tmpLoginMarker = document.getElementById('loginMarker').value.trim();
          tmpSessionConfig.CheckSessionLoginMarkerType = 'boolean';
          tmpSessionConfig.CheckSessionLoginMarker = tmpLoginMarker || 'LoggedIn';

          // Domain match — extract from server URL for auto-injection
          if (tmpServerURL) {
            try {
              let tmpUrlObj = new URL(tmpServerURL);
              tmpSessionConfig.DomainMatch = tmpUrlObj.host;
            } catch (pError) {
              tmpSessionConfig.DomainMatch = tmpServerURL;
            }
          }

          // Cookie injection
          let tmpCookieName = document.getElementById('cookieName').value.trim();
          tmpSessionConfig.CookieName = tmpCookieName || 'SessionID';
          let tmpCookieValueAddr = document.getElementById('cookieValueAddr').value.trim();
          if (tmpCookieValueAddr) tmpSessionConfig.CookieValueAddress = tmpCookieValueAddr;
          let tmpCookieValueTemplate = document.getElementById('cookieValueTemplate').value.trim();
          if (tmpCookieValueTemplate) tmpSessionConfig.CookieValueTemplate = tmpCookieValueTemplate;

          // Credentials
          let tmpUserName = document.getElementById('userName').value.trim();
          let tmpPassword = document.getElementById('password').value;
          tmpSessionConfig.Credentials = {};
          if (tmpUserName) tmpSessionConfig.Credentials.UserName = tmpUserName;
          if (tmpPassword) tmpSessionConfig.Credentials.Password = tmpPassword;
          tmpConfig.SessionManager.Sessions.SourceAPI = tmpSessionConfig;
          return tmpConfig;
        }
        generateConfig() {
          let tmpConfig = this.buildConfigObject();
          let tmpJson = JSON.stringify(tmpConfig, null, '\t');
          let tmpTextarea = document.getElementById('configOutput');
          tmpTextarea.value = tmpJson;
          tmpTextarea.style.display = '';

          // Build CLI flags from export options
          let tmpLogFlag = document.getElementById('exportLogFile').checked ? ' --log' : '';
          let tmpMaxFlag = '';
          let tmpExportMax = parseInt(document.getElementById('exportMaxRecords').value, 10);
          if (tmpExportMax > 0) tmpMaxFlag = ' --max ' + tmpExportMax;

          // Build CLI command (with config file)
          let tmpCliDiv = document.getElementById('cliCommand');
          tmpCliDiv.style.display = '';
          tmpCliDiv.querySelector('div').textContent = 'npx retold-data-service-clone --config clone-config.json --run' + tmpLogFlag + tmpMaxFlag;

          // Build one-liner (no config file needed) using --config-json
          let tmpOneShotDiv = document.getElementById('cliOneShot');
          tmpOneShotDiv.style.display = '';
          let tmpCompactJSON = JSON.stringify(tmpConfig);
          // Escape single quotes for shell wrapping
          let tmpEscapedJSON = tmpCompactJSON.replace(/'/g, "'\\''");
          let tmpOneShot = "npx retold-data-service-clone --config-json '" + tmpEscapedJSON + "' --run" + tmpLogFlag + tmpMaxFlag;
          tmpOneShotDiv.querySelector('div').textContent = tmpOneShot;

          // ---- meadow-integration (mdwint clone) config ----
          let tmpMdwintConfig = this.buildMeadowIntegrationConfig();
          let tmpMdwintJSON = JSON.stringify(tmpMdwintConfig, null, '\t');
          let tmpMdwintDiv = document.getElementById('mdwintExport');
          tmpMdwintDiv.style.display = '';
          let tmpMdwintTextarea = document.getElementById('mdwintConfigOutput');
          tmpMdwintTextarea.value = tmpMdwintJSON;

          // Build the mdwint CLI command
          let tmpMdwintCLI = 'mdwint clone --schema_path ./schema/Model-Extended.json';
          let tmpMdwintCLIDiv = document.getElementById('mdwintCLICommand');
          tmpMdwintCLIDiv.querySelector('div').textContent = tmpMdwintCLI;

          // Provider compatibility note
          let tmpProvider = document.getElementById('connProvider').value;
          if (tmpProvider !== 'MySQL' && tmpProvider !== 'MSSQL') {
            this.pict.providers.DataCloner.setStatus('mdwintConfigStatus', 'Note: mdwint clone only supports MySQL and MSSQL destinations. The config defaults to MySQL; update the Destination section for your target database.', 'warn');
          } else {
            this.pict.providers.DataCloner.setStatus('mdwintConfigStatus', '', '');
          }
          this.pict.providers.DataCloner.setStatus('configExportStatus', 'Config generated. Save as clone-config.json or copy the one-liner below.', 'ok');
        }
        copyConfig() {
          let tmpTextarea = document.getElementById('configOutput');
          if (!tmpTextarea.value) {
            this.pict.providers.DataCloner.setStatus('configExportStatus', 'Generate a config first.', 'warn');
            return;
          }
          let tmpSelf = this;
          navigator.clipboard.writeText(tmpTextarea.value).then(function () {
            tmpSelf.pict.providers.DataCloner.setStatus('configExportStatus', 'Config copied to clipboard.', 'ok');
          });
        }
        copyCLI() {
          let tmpCmd = document.getElementById('cliCommand').querySelector('div').textContent;
          let tmpSelf = this;
          navigator.clipboard.writeText(tmpCmd).then(function () {
            tmpSelf.pict.providers.DataCloner.setStatus('configExportStatus', 'CLI command copied to clipboard.', 'ok');
          });
        }
        copyOneShot() {
          let tmpCmd = document.getElementById('cliOneShot').querySelector('div').textContent;
          let tmpSelf = this;
          navigator.clipboard.writeText(tmpCmd).then(function () {
            tmpSelf.pict.providers.DataCloner.setStatus('configExportStatus', 'One-liner copied to clipboard.', 'ok');
          });
        }
        downloadConfig() {
          let tmpTextarea = document.getElementById('configOutput');
          if (!tmpTextarea.value) {
            this.generateConfig();
          }
          let tmpBlob = new Blob([tmpTextarea.value], {
            type: 'application/json'
          });
          let tmpAnchor = document.createElement('a');
          tmpAnchor.href = URL.createObjectURL(tmpBlob);
          tmpAnchor.download = 'clone-config.json';
          tmpAnchor.click();
          URL.revokeObjectURL(tmpAnchor.href);
          this.pict.providers.DataCloner.setStatus('configExportStatus', 'Config downloaded as clone-config.json.', 'ok');
        }
        copyMdwintConfig() {
          let tmpTextarea = document.getElementById('mdwintConfigOutput');
          if (!tmpTextarea.value) {
            this.pict.providers.DataCloner.setStatus('mdwintConfigStatus', 'Generate a config first.', 'warn');
            return;
          }
          let tmpSelf = this;
          navigator.clipboard.writeText(tmpTextarea.value).then(function () {
            tmpSelf.pict.providers.DataCloner.setStatus('mdwintConfigStatus', '.meadow.config.json copied to clipboard.', 'ok');
          });
        }
        copyMdwintCLI() {
          let tmpCmd = document.getElementById('mdwintCLICommand').querySelector('div').textContent;
          let tmpSelf = this;
          navigator.clipboard.writeText(tmpCmd).then(function () {
            tmpSelf.pict.providers.DataCloner.setStatus('mdwintConfigStatus', 'mdwint CLI command copied to clipboard.', 'ok');
          });
        }
        downloadMdwintConfig() {
          let tmpTextarea = document.getElementById('mdwintConfigOutput');
          if (!tmpTextarea.value) {
            this.generateConfig();
          }
          let tmpBlob = new Blob([tmpTextarea.value], {
            type: 'application/json'
          });
          let tmpAnchor = document.createElement('a');
          tmpAnchor.href = URL.createObjectURL(tmpBlob);
          tmpAnchor.download = '.meadow.config.json';
          tmpAnchor.click();
          URL.revokeObjectURL(tmpAnchor.href);
          this.pict.providers.DataCloner.setStatus('mdwintConfigStatus', 'Config downloaded as .meadow.config.json.', 'ok');
        }
      }
      module.exports = DataClonerExportView;
      module.exports.default_configuration = {
        ViewIdentifier: 'DataCloner-Export',
        DefaultRenderable: 'DataCloner-Export',
        DefaultDestinationAddress: '#DataCloner-Section-Export',
        Templates: [{
          Hash: 'DataCloner-Export',
          Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">6</div>
	<div class="accordion-card" id="section6" data-section="6">
		<div class="accordion-header" onclick="pict.views['DataCloner-Layout'].toggleSection('section6')">
			<div class="accordion-title">Export Configuration</div>
			<div class="accordion-preview" id="preview6">Generate JSON config for headless cloning</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<p style="font-size:0.9em; color:#666; margin-bottom:10px">Generate a JSON config file from your current settings. Use it to run headless clones from the command line.</p>
			<div class="inline-group">
				<div style="flex:0 0 200px">
					<label for="exportMaxRecords">Max Records per Entity</label>
					<input type="number" id="exportMaxRecords" value="" min="0" placeholder="0 = unlimited">
				</div>
				<div style="flex:0 0 auto; display:flex; align-items:flex-end; padding-bottom:2px">
					<div class="checkbox-row" style="margin-bottom:0">
						<input type="checkbox" id="exportLogFile" checked>
						<label for="exportLogFile">Write log file</label>
					</div>
				</div>
			</div>
			<div style="display:flex; gap:8px; margin-bottom:10px">
				<button class="primary" onclick="pict.views['DataCloner-Export'].generateConfig()">Generate Config</button>
				<button class="secondary" onclick="pict.views['DataCloner-Export'].copyConfig()">Copy to Clipboard</button>
				<button class="secondary" onclick="pict.views['DataCloner-Export'].downloadConfig()">Download JSON</button>
			</div>
			<div id="configExportStatus"></div>
			<div id="cliCommand" style="display:none; margin-bottom:10px">
				<label style="margin-bottom:4px">CLI Command <span style="color:#888; font-weight:normal">(with config file)</span></label>
				<div style="background:#1a1a1a; color:#4fc3f7; padding:10px 14px; border-radius:4px; font-family:monospace; font-size:0.9em; word-break:break-all; cursor:pointer" onclick="pict.views['DataCloner-Export'].copyCLI()" title="Click to copy"></div>
			</div>
			<div id="cliOneShot" style="display:none; margin-bottom:10px">
				<label style="margin-bottom:4px">One-liner <span style="color:#888; font-weight:normal">(no config file needed)</span></label>
				<div style="background:#1a1a1a; color:#4fc3f7; padding:10px 14px; border-radius:4px; font-family:monospace; font-size:0.9em; word-break:break-all; cursor:pointer; white-space:pre-wrap" onclick="pict.views['DataCloner-Export'].copyOneShot()" title="Click to copy"></div>
			</div>
			<textarea id="configOutput" style="display:none; width:100%; min-height:300px; font-family:monospace; font-size:0.85em; padding:10px; border:1px solid #ccc; border-radius:4px; background:#fafafa; tab-size:4; resize:vertical" readonly></textarea>

			<div id="mdwintExport" style="display:none; margin-top:16px; padding-top:16px; border-top:1px solid #eee">
				<h3 style="margin:0 0 8px; font-size:1em">meadow-integration CLI <span style="color:#888; font-weight:normal; font-size:0.85em">(mdwint clone)</span></h3>
				<p style="font-size:0.85em; color:#666; margin-bottom:8px">Save as <code>.meadow.config.json</code> in your project root, then run the command below. Requires a local Meadow extended schema JSON file.</p>
				<div style="display:flex; gap:8px; margin-bottom:10px">
					<button class="secondary" onclick="pict.views['DataCloner-Export'].copyMdwintConfig()">Copy Config</button>
					<button class="secondary" onclick="pict.views['DataCloner-Export'].downloadMdwintConfig()">Download .meadow.config.json</button>
				</div>
				<div id="mdwintCLICommand" style="margin-bottom:10px">
					<label style="margin-bottom:4px">CLI Command</label>
					<div style="background:#1a1a1a; color:#4fc3f7; padding:10px 14px; border-radius:4px; font-family:monospace; font-size:0.9em; word-break:break-all; cursor:pointer" onclick="pict.views['DataCloner-Export'].copyMdwintCLI()" title="Click to copy"></div>
				</div>
				<div id="mdwintConfigStatus"></div>
				<textarea id="mdwintConfigOutput" style="width:100%; min-height:250px; font-family:monospace; font-size:0.85em; padding:10px; border:1px solid #ccc; border-radius:4px; background:#fafafa; tab-size:4; resize:vertical" readonly></textarea>
			</div>
		</div>
	</div>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'DataCloner-Export',
          TemplateHash: 'DataCloner-Export',
          DestinationAddress: '#DataCloner-Section-Export'
        }]
      };
    }, {
      "pict-view": 8
    }],
    16: [function (require, module, exports) {
      const libPictView = require('pict-view');
      class DataClonerLayoutView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        onAfterRender() {
          // Render all section views into their containers
          this.pict.views['DataCloner-Connection'].render();
          this.pict.views['DataCloner-Session'].render();
          this.pict.views['DataCloner-Schema'].render();
          this.pict.views['DataCloner-Deploy'].render();
          this.pict.views['DataCloner-Sync'].render();
          this.pict.views['DataCloner-Export'].render();
          this.pict.views['DataCloner-ViewData'].render();
          this.pict.CSSMap.injectCSS();
        }
        toggleSection(pSectionId) {
          let tmpCard = document.getElementById(pSectionId);
          if (!tmpCard) return;
          tmpCard.classList.toggle('open');
        }
        expandAllSections() {
          let tmpCards = document.querySelectorAll('.accordion-card');
          for (let i = 0; i < tmpCards.length; i++) {
            tmpCards[i].classList.add('open');
          }
        }
        collapseAllSections() {
          let tmpCards = document.querySelectorAll('.accordion-card');
          for (let i = 0; i < tmpCards.length; i++) {
            tmpCards[i].classList.remove('open');
          }
        }
      }
      module.exports = DataClonerLayoutView;
      module.exports.default_configuration = {
        ViewIdentifier: 'DataCloner-Layout',
        DefaultRenderable: 'DataCloner-Layout',
        DefaultDestinationAddress: '#DataCloner-Application-Container',
        CSS: /*css*/`
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; padding: 20px; }
h1 { margin-bottom: 20px; color: #1a1a1a; }
h2 { margin-bottom: 12px; color: #444; font-size: 1.2em; border-bottom: 2px solid #ddd; padding-bottom: 6px; }

.section { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

/* Accordion layout */
.accordion-row { display: flex; gap: 0; margin-bottom: 16px; align-items: stretch; }
.accordion-number {
	flex: 0 0 48px; display: flex; align-items: flex-start; justify-content: center;
	padding-top: 16px; font-size: 1.6em; font-weight: 700; color: #4a90d9;
	user-select: none;
}
.accordion-card {
	flex: 1; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
	overflow: hidden; min-width: 0;
}
.accordion-header {
	display: flex; align-items: center; padding: 14px 20px; cursor: pointer;
	user-select: none; gap: 12px; transition: background 0.15s; line-height: 1.4;
}
.accordion-header:hover { background: #fafafa; }
.accordion-title { font-weight: 600; color: #333; font-size: 1.05em; white-space: nowrap; }
.accordion-preview { flex: 1; font-style: italic; color: #888; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.accordion-toggle {
	flex: 0 0 20px; display: flex; align-items: center; justify-content: center;
	border-radius: 4px; transition: background 0.15s, transform 0.25s; font-size: 0.7em; color: #888;
}
.accordion-header:hover .accordion-toggle { background: #eee; color: #555; }
.accordion-card.open .accordion-toggle { transform: rotate(180deg); }
.accordion-body { padding: 0 20px 20px; display: none; }
.accordion-card.open .accordion-body { display: block; }
.accordion-card.open .accordion-header { border-bottom: 1px solid #eee; }
.accordion-card.open .accordion-preview { display: none; }

/* Action controls (go link + auto checkbox) */
.accordion-actions { display: flex; align-items: baseline; gap: 8px; flex-shrink: 0; }
.accordion-card.open .accordion-actions { display: none; }
.accordion-go {
	font-size: 0.82em; color: #4a90d9; cursor: pointer; text-decoration: none;
	font-weight: 500; white-space: nowrap; padding: 2px 6px; border-radius: 3px;
	transition: background 0.15s;
}
.accordion-go:hover { background: #e8f0fe; text-decoration: underline; }
.accordion-auto {
	font-size: 0.82em; color: #999; white-space: nowrap; cursor: pointer;
}
.accordion-auto .auto-label { display: none; }
.accordion-auto:hover .auto-label { display: inline; }
.accordion-auto input[type="checkbox"] { width: auto; margin: 0; cursor: pointer; vertical-align: middle; position: relative; top: 0px; opacity: 0.75; transition: opacity 0.15s; }
.accordion-auto:hover input[type="checkbox"] { opacity: 1; }
.accordion-auto:hover { color: #666; }

/* Phase status indicator */
.accordion-phase {
	flex: 0 0 auto; display: none; align-items: center; justify-content: center;
	font-size: 0.85em; line-height: 1;
}
.accordion-phase.visible { display: flex; }
.accordion-phase-ok { color: #28a745; }
.accordion-phase-error { color: #dc3545; }
.accordion-phase-busy { color: #28a745; }
.accordion-phase-busy .phase-spinner {
	display: inline-block; width: 14px; height: 14px;
	border: 2px solid #28a745; border-top-color: transparent; border-radius: 50%;
	animation: phase-spin 0.8s linear infinite; vertical-align: middle;
}
@keyframes phase-spin {
	to { transform: rotate(360deg); }
}

.accordion-controls {
	display: flex; gap: 8px; margin-bottom: 12px; justify-content: flex-end;
}
.accordion-controls button {
	padding: 4px 10px; font-size: 0.82em; font-weight: 500; background: none;
	border: 1px solid #ccc; border-radius: 4px; color: #666; cursor: pointer; margin: 0;
}
.accordion-controls button:hover { background: #f0f0f0; border-color: #aaa; color: #333; }

label { display: block; font-weight: 600; margin-bottom: 4px; font-size: 0.9em; }
input[type="text"], input[type="password"], input[type="number"] {
	width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px;
	font-size: 0.95em; margin-bottom: 10px;
}
input[type="text"]:focus, input[type="password"]:focus, input[type="number"]:focus {
	outline: none; border-color: #4a90d9;
}

button {
	padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;
	font-size: 0.9em; font-weight: 600; margin-right: 8px; margin-bottom: 8px;
}
button.primary { background: #4a90d9; color: #fff; }
button.primary:hover { background: #357abd; }
button.secondary { background: #6c757d; color: #fff; }
button.secondary:hover { background: #5a6268; }
button.danger { background: #dc3545; color: #fff; }
button.danger:hover { background: #c82333; }
button.success { background: #28a745; color: #fff; }
button.success:hover { background: #218838; }
button:disabled { opacity: 0.5; cursor: not-allowed; }

.status { padding: 8px 12px; border-radius: 4px; margin-top: 10px; font-size: 0.9em; }
.status.ok { background: #d4edda; color: #155724; }
.status.error { background: #f8d7da; color: #721c24; }
.status.info { background: #d1ecf1; color: #0c5460; }
.status.warn { background: #fff3cd; color: #856404; }

.inline-group { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 10px; }
.inline-group > div { flex: 1; }

a { color: #4a90d9; }

select { background: #fff; width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95em; margin-bottom: 10px; }

.checkbox-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.checkbox-row input[type="checkbox"] { width: auto; margin: 0; }
.checkbox-row label { display: inline; margin: 0; font-weight: normal; cursor: pointer; }

/* Live Status Bar */
.live-status-bar {
	background: #fff; border-radius: 8px; padding: 14px 20px; margin-bottom: 16px;
	box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 14px;
	position: sticky; top: 0; z-index: 100; border-left: 4px solid #6c757d;
}
.live-status-bar.phase-idle { border-left-color: #6c757d; }
.live-status-bar.phase-disconnected { border-left-color: #dc3545; }
.live-status-bar.phase-ready { border-left-color: #4a90d9; }
.live-status-bar.phase-syncing { border-left-color: #28a745; }
.live-status-bar.phase-stopping { border-left-color: #ffc107; }
.live-status-bar.phase-complete { border-left-color: #28a745; }

.live-status-dot {
	width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
	background: #6c757d;
}
.live-status-bar.phase-idle .live-status-dot { background: #6c757d; }
.live-status-bar.phase-disconnected .live-status-dot { background: #dc3545; }
.live-status-bar.phase-ready .live-status-dot { background: #4a90d9; }
.live-status-bar.phase-syncing .live-status-dot {
	background: #28a745;
	animation: live-pulse 1.5s ease-in-out infinite;
}
.live-status-bar.phase-stopping .live-status-dot {
	background: #ffc107;
	animation: live-pulse 0.8s ease-in-out infinite;
}
.live-status-bar.phase-complete .live-status-dot { background: #28a745; }

@keyframes live-pulse {
	0%, 100% { opacity: 1; transform: scale(1); }
	50% { opacity: 0.4; transform: scale(0.8); }
}

.live-status-message { flex: 1; font-size: 0.92em; color: #333; line-height: 1.4; }

.live-status-meta {
	display: flex; gap: 16px; flex-shrink: 0; font-size: 0.82em; color: #666;
}
.live-status-meta-item { white-space: nowrap; }
.live-status-meta-item strong { color: #333; }

.live-status-progress-bar {
	height: 3px; background: #e9ecef; border-radius: 2px; overflow: hidden;
	position: absolute; bottom: 0; left: 0; right: 0;
}
.live-status-progress-fill {
	height: 100%; background: #28a745; transition: width 1s ease;
}
`,
        Templates: [{
          Hash: 'DataCloner-Layout',
          Template: /*html*/`
<h1>Retold Data Cloner</h1>

<!-- Live Status Bar -->
<div id="liveStatusBar" class="live-status-bar phase-idle" style="position:relative">
	<div class="live-status-dot"></div>
	<div class="live-status-message" id="liveStatusMessage">Idle</div>
	<div class="live-status-meta" id="liveStatusMeta"></div>
	<div class="live-status-progress-bar"><div class="live-status-progress-fill" id="liveStatusProgressFill" style="width:0%"></div></div>
</div>

<!-- Expand / Collapse All -->
<div class="accordion-controls">
	<button onclick="pict.views['DataCloner-Layout'].expandAllSections()">Expand All</button>
	<button onclick="pict.views['DataCloner-Layout'].collapseAllSections()">Collapse All</button>
</div>

<!-- Section containers -->
<div id="DataCloner-Section-Connection"></div>
<div id="DataCloner-Section-Session"></div>
<div id="DataCloner-Section-Schema"></div>
<div id="DataCloner-Section-Deploy"></div>
<div id="DataCloner-Section-Sync"></div>
<div id="DataCloner-Section-Export"></div>
<div id="DataCloner-Section-ViewData"></div>
`
        }],
        Renderables: [{
          RenderableHash: 'DataCloner-Layout',
          TemplateHash: 'DataCloner-Layout',
          DestinationAddress: '#DataCloner-Application-Container'
        }]
      };
    }, {
      "pict-view": 8
    }],
    17: [function (require, module, exports) {
      const libPictView = require('pict-view');
      class DataClonerSchemaView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        fetchSchema() {
          let tmpSchemaURL = document.getElementById('schemaURL').value.trim();
          let tmpBody = {};
          if (tmpSchemaURL) {
            tmpBody.SchemaURL = tmpSchemaURL;
          }
          this.pict.providers.DataCloner.setSectionPhase(3, 'busy');
          this.pict.providers.DataCloner.setStatus('schemaStatus', 'Fetching schema...', 'info');
          this.pict.providers.DataCloner.api('POST', '/clone/schema/fetch', tmpBody).then(pData => {
            if (pData.Success) {
              this.pict.AppData.DataCloner.FetchedTables = pData.Tables || [];
              this.pict.providers.DataCloner.setStatus('schemaStatus', 'Fetched ' + pData.TableCount + ' tables from ' + pData.SchemaURL, 'ok');
              this.pict.providers.DataCloner.setSectionPhase(3, 'ok');
              this.renderTableList();
            } else {
              this.pict.providers.DataCloner.setStatus('schemaStatus', 'Fetch failed: ' + (pData.Error || 'Unknown error'), 'error');
              this.pict.providers.DataCloner.setSectionPhase(3, 'error');
            }
          }).catch(pError => {
            this.pict.providers.DataCloner.setStatus('schemaStatus', 'Request failed: ' + pError.message, 'error');
            this.pict.providers.DataCloner.setSectionPhase(3, 'error');
          });
        }
        loadSavedSelections() {
          try {
            let tmpRaw = localStorage.getItem('dataCloner_selectedTables');
            if (tmpRaw) {
              return JSON.parse(tmpRaw);
            }
          } catch (pError) {
            /* ignore */
          }
          return null;
        }
        saveSelections() {
          let tmpSelected = this.getSelectedTables();
          localStorage.setItem('dataCloner_selectedTables', JSON.stringify(tmpSelected));
          this.updateSelectionCount();
          this.pict.providers.DataCloner.updateAllPreviews();
        }
        updateSelectionCount() {
          let tmpFetchedTables = this.pict.AppData.DataCloner.FetchedTables || [];
          let tmpCount = this.getSelectedTables().length;
          let tmpEl = document.getElementById('tableSelectionCount');
          if (tmpEl) {
            tmpEl.textContent = tmpCount + ' / ' + tmpFetchedTables.length + ' selected';
          }
        }
        renderTableList() {
          let tmpFetchedTables = this.pict.AppData.DataCloner.FetchedTables || [];
          let tmpContainer = document.getElementById('tableList');
          tmpContainer.innerHTML = '';

          // Load previously saved selections; if none, default to none checked
          let tmpSaved = this.loadSavedSelections();
          let tmpSavedSet = null;
          if (tmpSaved) {
            tmpSavedSet = {};
            for (let i = 0; i < tmpSaved.length; i++) {
              tmpSavedSet[tmpSaved[i]] = true;
            }
          }
          for (let i = 0; i < tmpFetchedTables.length; i++) {
            let tmpName = tmpFetchedTables[i];
            let tmpDiv = document.createElement('div');
            tmpDiv.className = 'table-item';
            tmpDiv.setAttribute('data-table', tmpName.toLowerCase());
            let tmpCheckbox = document.createElement('input');
            tmpCheckbox.type = 'checkbox';
            tmpCheckbox.id = 'tbl_' + tmpName;
            tmpCheckbox.value = tmpName;
            // If we have saved selections, restore them; otherwise default unchecked
            tmpCheckbox.checked = tmpSavedSet ? tmpSavedSet[tmpName] === true : false;
            tmpCheckbox.addEventListener('change', () => {
              this.saveSelections();
            });
            let tmpLabel = document.createElement('label');
            tmpLabel.htmlFor = 'tbl_' + tmpName;
            tmpLabel.textContent = tmpName;
            tmpDiv.appendChild(tmpCheckbox);
            tmpDiv.appendChild(tmpLabel);
            tmpContainer.appendChild(tmpDiv);
          }
          document.getElementById('tableSelection').style.display = tmpFetchedTables.length > 0 ? 'block' : 'none';
          document.getElementById('tableFilter').value = '';
          this.updateSelectionCount();
        }
        filterTableList() {
          let tmpFilter = document.getElementById('tableFilter').value.toLowerCase().trim();
          let tmpItems = document.getElementById('tableList').children;
          for (let i = 0; i < tmpItems.length; i++) {
            let tmpName = tmpItems[i].getAttribute('data-table') || '';
            tmpItems[i].style.display = !tmpFilter || tmpName.indexOf(tmpFilter) >= 0 ? '' : 'none';
          }
        }
        selectAllTables(pChecked) {
          let tmpFetchedTables = this.pict.AppData.DataCloner.FetchedTables || [];
          // Only affect visible (non-filtered) items
          let tmpFilter = document.getElementById('tableFilter').value.toLowerCase().trim();
          for (let i = 0; i < tmpFetchedTables.length; i++) {
            let tmpName = tmpFetchedTables[i];
            if (tmpFilter && tmpName.toLowerCase().indexOf(tmpFilter) < 0) {
              continue;
            }
            let tmpCheckbox = document.getElementById('tbl_' + tmpName);
            if (tmpCheckbox) {
              tmpCheckbox.checked = pChecked;
            }
          }
          this.saveSelections();
        }
        getSelectedTables() {
          let tmpFetchedTables = this.pict.AppData.DataCloner.FetchedTables || [];
          let tmpSelected = [];
          for (let i = 0; i < tmpFetchedTables.length; i++) {
            let tmpCheckbox = document.getElementById('tbl_' + tmpFetchedTables[i]);
            if (tmpCheckbox && tmpCheckbox.checked) {
              tmpSelected.push(tmpFetchedTables[i]);
            }
          }
          return tmpSelected;
        }
      }
      module.exports = DataClonerSchemaView;
      module.exports.default_configuration = {
        ViewIdentifier: 'DataCloner-Schema',
        DefaultRenderable: 'DataCloner-Schema',
        DefaultDestinationAddress: '#DataCloner-Section-Schema',
        CSS: /*css*/`
.table-list { max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin: 10px 0; }
.table-item { padding: 4px 8px; display: flex; align-items: center; }
.table-item:hover { background: #f0f0f0; }
.table-item input[type="checkbox"] { margin-right: 8px; width: auto; }
.table-item label { display: inline; font-weight: normal; margin-bottom: 0; cursor: pointer; }
`,
        Templates: [{
          Hash: 'DataCloner-Schema',
          Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">3</div>
	<div class="accordion-card" id="section3" data-section="3">
		<div class="accordion-header" onclick="pict.views['DataCloner-Layout'].toggleSection('section3')">
			<div class="accordion-title">Remote Schema</div>
			<span class="accordion-phase" id="phase3"></span>
			<div class="accordion-preview" id="preview3">Fetch and select tables from the remote server</div>
			<div class="accordion-actions">
				<span class="accordion-go" onclick="event.stopPropagation(); pict.views['DataCloner-Schema'].fetchSchema()">go</span>
				<label class="accordion-auto" onclick="event.stopPropagation()"><input type="checkbox" id="auto3"> <span class="auto-label">auto</span></label>
			</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<label for="schemaURL">Schema URL (leave blank for default: /1.0/Retold/Models)</label>
			<input type="text" id="schemaURL" placeholder="http://remote-server:8086/1.0/Retold/Models">

			<button class="primary" onclick="pict.views['DataCloner-Schema'].fetchSchema()">Fetch Schema</button>
			<div id="schemaStatus"></div>

			<div id="tableSelection" style="display:none">
				<h3 style="margin:12px 0 8px; font-size:1em;">Select Tables</h3>
				<div style="display:flex; gap:8px; align-items:center; margin-bottom:8px">
					<input type="text" id="tableFilter" placeholder="Filter tables..." style="flex:1; margin-bottom:0" oninput="pict.views['DataCloner-Schema'].filterTableList()">
					<button class="secondary" onclick="pict.views['DataCloner-Schema'].selectAllTables(true)" style="font-size:0.8em">Select All</button>
					<button class="secondary" onclick="pict.views['DataCloner-Schema'].selectAllTables(false)" style="font-size:0.8em">Deselect All</button>
					<span id="tableSelectionCount" style="font-size:0.85em; color:#666; white-space:nowrap"></span>
				</div>
				<div id="tableList" class="table-list"></div>
			</div>
		</div>
	</div>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'DataCloner-Schema',
          TemplateHash: 'DataCloner-Schema',
          DestinationAddress: '#DataCloner-Section-Schema'
        }]
      };
    }, {
      "pict-view": 8
    }],
    18: [function (require, module, exports) {
      const libPictView = require('pict-view');
      class DataClonerSessionView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        configureSession() {
          let tmpServerURL = document.getElementById('serverURL').value.trim();
          if (!tmpServerURL) {
            this.pict.providers.DataCloner.setStatus('sessionConfigStatus', 'Server URL is required.', 'error');
            return;
          }
          let tmpBody = {
            ServerURL: tmpServerURL.replace(/\/+$/, '') + '/1.0/'
          };
          let tmpAuthMethod = document.getElementById('authMethod').value.trim();
          if (tmpAuthMethod) {
            tmpBody.AuthenticationMethod = tmpAuthMethod;
          }
          let tmpAuthURI = document.getElementById('authURI').value.trim();
          if (tmpAuthURI) {
            tmpBody.AuthenticationURITemplate = tmpAuthURI;
          }
          let tmpCheckURI = document.getElementById('checkURI').value.trim();
          if (tmpCheckURI) {
            tmpBody.CheckSessionURITemplate = tmpCheckURI;
          }
          let tmpCookieName = document.getElementById('cookieName').value.trim();
          if (tmpCookieName) {
            tmpBody.CookieName = tmpCookieName;
          }
          let tmpCookieValueAddr = document.getElementById('cookieValueAddr').value.trim();
          if (tmpCookieValueAddr) {
            tmpBody.CookieValueAddress = tmpCookieValueAddr;
          }
          let tmpCookieValueTemplate = document.getElementById('cookieValueTemplate').value.trim();
          if (tmpCookieValueTemplate) {
            tmpBody.CookieValueTemplate = tmpCookieValueTemplate;
          }
          let tmpLoginMarker = document.getElementById('loginMarker').value.trim();
          if (tmpLoginMarker) {
            tmpBody.CheckSessionLoginMarker = tmpLoginMarker;
          }
          this.pict.providers.DataCloner.setStatus('sessionConfigStatus', 'Configuring session...', 'info');
          this.pict.providers.DataCloner.api('POST', '/clone/session/configure', tmpBody).then(pData => {
            if (pData.Success) {
              this.pict.providers.DataCloner.setStatus('sessionConfigStatus', 'Session configured for ' + pData.ServerURL + ' (domain: ' + pData.DomainMatch + ')', 'ok');
            } else {
              this.pict.providers.DataCloner.setStatus('sessionConfigStatus', 'Configuration failed: ' + (pData.Error || 'Unknown error'), 'error');
            }
          }).catch(pError => {
            this.pict.providers.DataCloner.setStatus('sessionConfigStatus', 'Request failed: ' + pError.message, 'error');
          });
        }
        authenticate() {
          let tmpUserName = document.getElementById('userName').value.trim();
          let tmpPassword = document.getElementById('password').value.trim();
          if (!tmpUserName || !tmpPassword) {
            this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Username and password are required.', 'error');
            this.pict.providers.DataCloner.setSectionPhase(2, 'error');
            return;
          }
          this.pict.providers.DataCloner.setSectionPhase(2, 'busy');
          this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Authenticating...', 'info');
          this.pict.providers.DataCloner.api('POST', '/clone/session/authenticate', {
            UserName: tmpUserName,
            Password: tmpPassword
          }).then(pData => {
            if (pData.Success && pData.Authenticated) {
              this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Authenticated successfully.', 'ok');
              this.pict.providers.DataCloner.setSectionPhase(2, 'ok');
            } else {
              this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Authentication failed: ' + (pData.Error || 'Not authenticated'), 'error');
              this.pict.providers.DataCloner.setSectionPhase(2, 'error');
            }
          }).catch(pError => {
            this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Request failed: ' + pError.message, 'error');
            this.pict.providers.DataCloner.setSectionPhase(2, 'error');
          });
        }
        checkSession() {
          this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Checking session...', 'info');
          this.pict.providers.DataCloner.api('GET', '/clone/session/check').then(pData => {
            if (pData.Authenticated) {
              this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Session is active. Server: ' + (pData.ServerURL || 'N/A'), 'ok');
            } else if (pData.Configured) {
              this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Session configured but not authenticated.', 'warn');
            } else {
              this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'No session configured.', 'warn');
            }
          }).catch(pError => {
            this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Request failed: ' + pError.message, 'error');
          });
        }
        deauthenticate() {
          this.pict.providers.DataCloner.api('POST', '/clone/session/deauthenticate').then(pData => {
            this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Session deauthenticated.', 'info');
          }).catch(pError => {
            this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Request failed: ' + pError.message, 'error');
          });
        }
        goAction() {
          // Two-step: configure session, then authenticate after delay
          this.pict.providers.DataCloner.setSectionPhase(2, 'busy');
          this.configureSession();
          setTimeout(() => {
            this.authenticate();
          }, 1500);
        }
      }
      module.exports = DataClonerSessionView;
      module.exports.default_configuration = {
        ViewIdentifier: 'DataCloner-Session',
        DefaultRenderable: 'DataCloner-Session',
        DefaultDestinationAddress: '#DataCloner-Section-Session',
        Templates: [{
          Hash: 'DataCloner-Session',
          Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">2</div>
	<div class="accordion-card" id="section2" data-section="2">
		<div class="accordion-header" onclick="pict.views['DataCloner-Layout'].toggleSection('section2')">
			<div class="accordion-title">Remote Session</div>
			<span class="accordion-phase" id="phase2"></span>
			<div class="accordion-preview" id="preview2">Configure remote server URL and credentials</div>
			<div class="accordion-actions">
				<span class="accordion-go" onclick="event.stopPropagation(); pict.views['DataCloner-Session'].goAction()">go</span>
				<label class="accordion-auto" onclick="event.stopPropagation()"><input type="checkbox" id="auto2"> <span class="auto-label">auto</span></label>
			</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<div class="inline-group">
				<div style="flex:2">
					<label for="serverURL">Remote Server URL</label>
					<input type="text" id="serverURL" placeholder="http://remote-server:8086" value="">
				</div>
				<div style="flex:1">
					<label for="authMethod">Auth Method</label>
					<input type="text" id="authMethod" placeholder="get" value="get">
				</div>
			</div>

			<details style="margin-bottom:10px">
				<summary style="cursor:pointer; font-size:0.9em; color:#666">Advanced Session Options</summary>
				<div style="padding:10px 0">
					<label for="authURI">Authentication URI Template (leave blank for default)</label>
					<input type="text" id="authURI" placeholder="Authenticate/{~D:Record.UserName~}/{~D:Record.Password~}">
					<label for="checkURI">Check Session URI Template</label>
					<input type="text" id="checkURI" placeholder="CheckSession">
					<label for="cookieName">Cookie Name</label>
					<input type="text" id="cookieName" placeholder="SessionID" value="SessionID">
					<label for="cookieValueAddr">Cookie Value Address</label>
					<input type="text" id="cookieValueAddr" placeholder="SessionID" value="SessionID">
					<label for="cookieValueTemplate">Cookie Value Template (overrides Address if set)</label>
					<input type="text" id="cookieValueTemplate" placeholder="{~D:Record.SessionID~}">
					<label for="loginMarker">Login Marker</label>
					<input type="text" id="loginMarker" placeholder="LoggedIn" value="LoggedIn">
				</div>
			</details>

			<button class="primary" onclick="pict.views['DataCloner-Session'].configureSession()">Configure Session</button>
			<div id="sessionConfigStatus"></div>

			<hr style="margin:16px 0; border:none; border-top:1px solid #eee">

			<div class="inline-group">
				<div>
					<label for="userName">Username</label>
					<input type="text" id="userName" placeholder="username">
				</div>
				<div>
					<label for="password">Password</label>
					<input type="password" id="password" placeholder="password">
				</div>
			</div>

			<button class="success" onclick="pict.views['DataCloner-Session'].authenticate()">Authenticate</button>
			<button class="secondary" onclick="pict.views['DataCloner-Session'].checkSession()">Check Session</button>
			<button class="danger" onclick="pict.views['DataCloner-Session'].deauthenticate()">Deauthenticate</button>
			<div id="sessionAuthStatus"></div>
		</div>
	</div>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'DataCloner-Session',
          TemplateHash: 'DataCloner-Session',
          DestinationAddress: '#DataCloner-Section-Session'
        }]
      };
    }, {
      "pict-view": 8
    }],
    19: [function (require, module, exports) {
      const libPictView = require('pict-view');
      class DataClonerSyncView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        startSync() {
          let tmpSelectedTables = this.pict.views['DataCloner-Schema'].getSelectedTables();
          let tmpPageSize = parseInt(document.getElementById('pageSize').value, 10) || 100;
          let tmpDateTimePrecisionMS = parseInt(document.getElementById('dateTimePrecisionMS').value, 10);
          if (isNaN(tmpDateTimePrecisionMS)) tmpDateTimePrecisionMS = 1000;
          let tmpSyncDeletedRecords = document.getElementById('syncDeletedRecords').checked;
          let tmpSyncMode = document.querySelector('input[name="syncMode"]:checked').value;
          if (tmpSelectedTables.length === 0) {
            this.pict.providers.DataCloner.setStatus('syncStatus', 'No tables selected for sync.', 'error');
            this.pict.providers.DataCloner.setSectionPhase(5, 'error');
            return;
          }
          this.pict.providers.DataCloner.setSectionPhase(5, 'busy');
          this.pict.providers.DataCloner.setStatus('syncStatus', 'Starting ' + tmpSyncMode.toLowerCase() + ' sync...', 'info');
          let tmpSelf = this;
          this.pict.providers.DataCloner.api('POST', '/clone/sync/start', {
            Tables: tmpSelectedTables,
            PageSize: tmpPageSize,
            DateTimePrecisionMS: tmpDateTimePrecisionMS,
            SyncDeletedRecords: tmpSyncDeletedRecords,
            SyncMode: tmpSyncMode
          }).then(function (pData) {
            if (pData.Success) {
              let tmpMsg = pData.SyncMode + ' sync started for ' + pData.Tables.length + ' tables.';
              if (pData.SyncDeletedRecords) tmpMsg += ' (including deleted records)';
              tmpSelf.pict.providers.DataCloner.setStatus('syncStatus', tmpMsg, 'ok');
              tmpSelf.startPolling();
            } else {
              tmpSelf.pict.providers.DataCloner.setStatus('syncStatus', 'Sync start failed: ' + (pData.Error || 'Unknown error'), 'error');
              tmpSelf.pict.providers.DataCloner.setSectionPhase(5, 'error');
            }
          }).catch(function (pError) {
            tmpSelf.pict.providers.DataCloner.setStatus('syncStatus', 'Request failed: ' + pError.message, 'error');
            tmpSelf.pict.providers.DataCloner.setSectionPhase(5, 'error');
          });
        }
        stopSync() {
          let tmpSelf = this;
          this.pict.providers.DataCloner.api('POST', '/clone/sync/stop').then(function (pData) {
            tmpSelf.pict.providers.DataCloner.setStatus('syncStatus', 'Sync stop requested.', 'warn');
          }).catch(function (pError) {
            tmpSelf.pict.providers.DataCloner.setStatus('syncStatus', 'Request failed: ' + pError.message, 'error');
          });
        }
        startPolling() {
          if (this.pict.AppData.DataCloner.SyncPollTimer) clearInterval(this.pict.AppData.DataCloner.SyncPollTimer);
          let tmpSelf = this;
          this.pict.AppData.DataCloner.SyncPollTimer = setInterval(function () {
            tmpSelf.pollSyncStatus();
          }, 2000);
          this.pollSyncStatus();
        }
        stopPolling() {
          if (this.pict.AppData.DataCloner.SyncPollTimer) {
            clearInterval(this.pict.AppData.DataCloner.SyncPollTimer);
            this.pict.AppData.DataCloner.SyncPollTimer = null;
          }
        }
        pollSyncStatus() {
          let tmpSelf = this;
          this.pict.providers.DataCloner.api('GET', '/clone/sync/status').then(function (pData) {
            tmpSelf.renderSyncProgress(pData);
            if (!pData.Running && !pData.Stopping) {
              tmpSelf.stopPolling();
              if (Object.keys(pData.Tables || {}).length > 0) {
                // Check if any tables had errors or partial sync
                let tmpTables = pData.Tables || {};
                let tmpHasErrors = false;
                let tmpHasPartial = false;
                let tmpNames = Object.keys(tmpTables);
                for (let i = 0; i < tmpNames.length; i++) {
                  if (tmpTables[tmpNames[i]].Status === 'Error') tmpHasErrors = true;
                  if (tmpTables[tmpNames[i]].Status === 'Partial') tmpHasPartial = true;
                }
                if (tmpHasErrors) {
                  tmpSelf.pict.providers.DataCloner.setStatus('syncStatus', 'Sync finished with errors. Check the table below for details.', 'error');
                  tmpSelf.pict.providers.DataCloner.setSectionPhase(5, 'error');
                } else if (tmpHasPartial) {
                  tmpSelf.pict.providers.DataCloner.setStatus('syncStatus', 'Sync finished. Some records were skipped (GUID conflicts or permission issues).', 'warn');
                  tmpSelf.pict.providers.DataCloner.setSectionPhase(5, 'ok');
                } else {
                  tmpSelf.pict.providers.DataCloner.setStatus('syncStatus', 'Sync complete.', 'ok');
                  tmpSelf.pict.providers.DataCloner.setSectionPhase(5, 'ok');
                }

                // Fetch the structured report
                tmpSelf.fetchSyncReport();
              }
            }
          }).catch(function (pError) {
            // Silently ignore poll errors
          });
        }
        fetchSyncReport() {
          let tmpSelf = this;
          this.pict.providers.DataCloner.api('GET', '/clone/sync/report').then(function (pData) {
            if (pData && pData.ReportVersion) {
              tmpSelf.pict.AppData.DataCloner.LastReport = pData;
              tmpSelf.renderSyncReport(pData);
            }
          }).catch(function (pError) {
            // Ignore report fetch errors
          });
        }
        renderSyncReport(pReport) {
          let tmpSection = document.getElementById('syncReportSection');
          tmpSection.style.display = '';

          // --- Summary Cards ---
          let tmpCardsContainer = document.getElementById('reportSummaryCards');
          let tmpOutcomeClass = 'outcome-' + pReport.Outcome.toLowerCase();
          let tmpOutcomeColor = {
            Success: '#28a745',
            Partial: '#ffc107',
            Error: '#dc3545',
            Stopped: '#6c757d'
          }[pReport.Outcome] || '#666';
          let tmpDurationSec = pReport.RunTimestamps.DurationSeconds || 0;
          let tmpDurationStr = tmpDurationSec < 60 ? tmpDurationSec + 's' : Math.floor(tmpDurationSec / 60) + 'm ' + tmpDurationSec % 60 + 's';
          let tmpTotalSynced = pReport.Summary.TotalSynced.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          let tmpTotalRecords = pReport.Summary.TotalRecords.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          tmpCardsContainer.innerHTML = '' + '<div class="report-card ' + tmpOutcomeClass + '">' + '  <div class="card-label">Outcome</div>' + '  <div class="card-value" style="color:' + tmpOutcomeColor + '">' + pReport.Outcome + '</div>' + '</div>' + '<div class="report-card">' + '  <div class="card-label">Mode</div>' + '  <div class="card-value">' + pReport.Config.SyncMode + '</div>' + '</div>' + '<div class="report-card">' + '  <div class="card-label">Duration</div>' + '  <div class="card-value">' + tmpDurationStr + '</div>' + '</div>' + '<div class="report-card">' + '  <div class="card-label">Tables</div>' + '  <div class="card-value">' + pReport.Summary.Complete + ' / ' + pReport.Summary.TotalTables + '</div>' + '</div>' + '<div class="report-card">' + '  <div class="card-label">Records</div>' + '  <div class="card-value">' + tmpTotalSynced + '</div>' + '  <div style="font-size:0.75em; color:#888">of ' + tmpTotalRecords + '</div>' + '</div>';

          // --- Anomalies ---
          let tmpAnomalyContainer = document.getElementById('reportAnomalies');
          if (pReport.Anomalies.length === 0) {
            tmpAnomalyContainer.innerHTML = '<div style="color:#28a745; font-weight:600; font-size:0.9em">No anomalies detected.</div>';
          } else {
            let tmpHtml = '<h4 style="margin:0 0 8px; color:#dc3545; font-size:0.95em">Anomalies (' + pReport.Anomalies.length + ')</h4>';
            tmpHtml += '<table class="progress-table">';
            tmpHtml += '<tr><th>Table</th><th>Type</th><th>Message</th></tr>';
            for (let i = 0; i < pReport.Anomalies.length; i++) {
              let tmpAnomaly = pReport.Anomalies[i];
              let tmpTypeColor = tmpAnomaly.Type === 'Error' ? '#dc3545' : tmpAnomaly.Type === 'Partial' ? '#ffc107' : '#6c757d';
              tmpHtml += '<tr>';
              tmpHtml += '<td><strong>' + this.pict.providers.DataCloner.escapeHtml(tmpAnomaly.Table) + '</strong></td>';
              tmpHtml += '<td style="color:' + tmpTypeColor + '">' + tmpAnomaly.Type + '</td>';
              tmpHtml += '<td>' + this.pict.providers.DataCloner.escapeHtml(tmpAnomaly.Message) + '</td>';
              tmpHtml += '</tr>';
            }
            tmpHtml += '</table>';
            tmpAnomalyContainer.innerHTML = tmpHtml;
          }

          // --- Top Tables by Duration ---
          let tmpTopContainer = document.getElementById('reportTopTables');
          let tmpTopCount = Math.min(10, pReport.Tables.length);
          if (tmpTopCount > 0) {
            let tmpHtml = '<h4 style="margin:0 0 8px; font-size:0.95em; color:#444">Top Tables by Duration</h4>';
            tmpHtml += '<table class="progress-table">';
            tmpHtml += '<tr><th>Table</th><th>Duration</th><th>Records</th><th>Status</th></tr>';
            for (let i = 0; i < tmpTopCount; i++) {
              let tmpTable = pReport.Tables[i];
              let tmpDur = tmpTable.DurationSeconds < 60 ? tmpTable.DurationSeconds + 's' : Math.floor(tmpTable.DurationSeconds / 60) + 'm ' + tmpTable.DurationSeconds % 60 + 's';
              let tmpRecs = tmpTable.Total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
              let tmpStatusColor = {
                Complete: '#28a745',
                Error: '#dc3545',
                Partial: '#ffc107'
              }[tmpTable.Status] || '#666';
              tmpHtml += '<tr>';
              tmpHtml += '<td><strong>' + this.pict.providers.DataCloner.escapeHtml(tmpTable.Name) + '</strong></td>';
              tmpHtml += '<td>' + tmpDur + '</td>';
              tmpHtml += '<td>' + tmpRecs + '</td>';
              tmpHtml += '<td style="color:' + tmpStatusColor + '">' + tmpTable.Status + '</td>';
              tmpHtml += '</tr>';
            }
            tmpHtml += '</table>';
            tmpTopContainer.innerHTML = tmpHtml;
          }
        }
        downloadReport() {
          if (!this.pict.AppData.DataCloner.LastReport) {
            this.pict.providers.DataCloner.setStatus('reportStatus', 'No report available.', 'warn');
            return;
          }
          let tmpJson = JSON.stringify(this.pict.AppData.DataCloner.LastReport, null, '\t');
          let tmpBlob = new Blob([tmpJson], {
            type: 'application/json'
          });
          let tmpAnchor = document.createElement('a');
          tmpAnchor.href = URL.createObjectURL(tmpBlob);
          let tmpTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          tmpAnchor.download = 'DataCloner-Report-' + tmpTimestamp + '.json';
          tmpAnchor.click();
          URL.revokeObjectURL(tmpAnchor.href);
          this.pict.providers.DataCloner.setStatus('reportStatus', 'Report downloaded.', 'ok');
        }
        copyReport() {
          if (!this.pict.AppData.DataCloner.LastReport) {
            this.pict.providers.DataCloner.setStatus('reportStatus', 'No report available.', 'warn');
            return;
          }
          let tmpJson = JSON.stringify(this.pict.AppData.DataCloner.LastReport, null, '\t');
          let tmpSelf = this;
          navigator.clipboard.writeText(tmpJson).then(function () {
            tmpSelf.pict.providers.DataCloner.setStatus('reportStatus', 'Report copied to clipboard.', 'ok');
          });
        }
        renderSyncProgress(pData) {
          let tmpContainer = document.getElementById('syncProgress');
          let tmpTables = pData.Tables || {};
          let tmpTableNames = Object.keys(tmpTables);
          if (tmpTableNames.length === 0) {
            tmpContainer.innerHTML = '';
            return;
          }
          let tmpHtml = '<table class="progress-table">';
          tmpHtml += '<tr><th>Table</th><th>Status</th><th>Progress</th><th>Synced</th><th>Details</th></tr>';
          for (let i = 0; i < tmpTableNames.length; i++) {
            let tmpName = tmpTableNames[i];
            let tmpTable = tmpTables[tmpName];

            // Calculate percentage: if total is 0, show 100% (nothing to sync)
            let tmpPct = 0;
            if (tmpTable.Total === 0 && (tmpTable.Status === 'Complete' || tmpTable.Status === 'Error')) {
              tmpPct = 100;
            } else if (tmpTable.Total > 0) {
              tmpPct = Math.round(tmpTable.Synced / tmpTable.Total * 100);
            }

            // Color the progress bar based on status
            let tmpBarColor = '#28a745'; // green
            if (tmpTable.Status === 'Error') tmpBarColor = '#dc3545'; // red
            else if (tmpTable.Status === 'Partial') tmpBarColor = '#ffc107'; // yellow
            else if (tmpTable.Status === 'Syncing') tmpBarColor = '#4a90d9'; // blue

            // Status badge
            let tmpStatusBadge = tmpTable.Status;
            if (tmpTable.Status === 'Complete' && tmpTable.Total === 0) tmpStatusBadge = 'Complete (empty)';
            if (tmpTable.Status === 'Partial') tmpStatusBadge = 'Partial \u26A0';
            if (tmpTable.Status === 'Error') tmpStatusBadge = 'Error \u2716';

            // Details column
            let tmpDetails = '';
            if (tmpTable.ErrorMessage) tmpDetails = tmpTable.ErrorMessage;else if (tmpTable.Skipped > 0) tmpDetails = tmpTable.Skipped + ' record(s) skipped';else if ((tmpTable.Errors || 0) > 0) tmpDetails = tmpTable.Errors + ' error(s)';else if (tmpTable.Status === 'Complete' && tmpTable.Total === 0) tmpDetails = 'No records on server';else if (tmpTable.Status === 'Complete') tmpDetails = '\u2714 OK';
            tmpHtml += '<tr>';
            tmpHtml += '<td><strong>' + tmpName + '</strong></td>';
            tmpHtml += '<td>' + tmpStatusBadge + '</td>';
            tmpHtml += '<td>';
            tmpHtml += '<div class="progress-bar-container"><div class="progress-bar-fill" style="width:' + tmpPct + '%; background:' + tmpBarColor + '"></div></div>';
            tmpHtml += ' ' + tmpPct + '%';
            tmpHtml += '</td>';
            tmpHtml += '<td>' + tmpTable.Synced + ' / ' + tmpTable.Total + '</td>';
            tmpHtml += '<td>' + tmpDetails + '</td>';
            tmpHtml += '</tr>';
          }
          tmpHtml += '</table>';
          tmpContainer.innerHTML = tmpHtml;
        }
      }
      module.exports = DataClonerSyncView;
      module.exports.default_configuration = {
        ViewIdentifier: 'DataCloner-Sync',
        DefaultRenderable: 'DataCloner-Sync',
        DefaultDestinationAddress: '#DataCloner-Section-Sync',
        CSS: /*css*/`
.progress-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.progress-table th, .progress-table td { text-align: left; padding: 6px 12px; border-bottom: 1px solid #eee; font-size: 0.9em; }
.progress-table th { background: #f8f9fa; font-weight: 600; }
.progress-bar-container { width: 120px; height: 16px; background: #e9ecef; border-radius: 8px; overflow: hidden; display: inline-block; vertical-align: middle; }
.progress-bar-fill { height: 100%; background: #28a745; transition: width 0.3s; }
.report-card { background: #f8f9fa; border-radius: 8px; padding: 12px 16px; min-width: 140px; text-align: center; border: 1px solid #e9ecef; }
.report-card .card-label { font-size: 0.8em; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.report-card .card-value { font-size: 1.4em; font-weight: 700; }
.report-card.outcome-success { border-left: 4px solid #28a745; }
.report-card.outcome-partial { border-left: 4px solid #ffc107; }
.report-card.outcome-error { border-left: 4px solid #dc3545; }
.report-card.outcome-stopped { border-left: 4px solid #6c757d; }
`,
        Templates: [{
          Hash: 'DataCloner-Sync',
          Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">5</div>
	<div class="accordion-card" id="section5" data-section="5">
		<div class="accordion-header" onclick="pict.views['DataCloner-Layout'].toggleSection('section5')">
			<div class="accordion-title">Synchronize Data</div>
			<span class="accordion-phase" id="phase5"></span>
			<div class="accordion-preview" id="preview5">Initial sync, page size 100</div>
			<div class="accordion-actions">
				<span class="accordion-go" onclick="event.stopPropagation(); pict.views['DataCloner-Sync'].startSync()">go</span>
				<label class="accordion-auto" onclick="event.stopPropagation()"><input type="checkbox" id="auto5"> <span class="auto-label">auto</span></label>
			</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<div style="display:flex; gap:8px; align-items:flex-end; margin-bottom:4px">
				<div style="flex:0 0 150px">
					<label for="pageSize">Page Size</label>
					<input type="number" id="pageSize" value="100" min="1" max="10000" style="margin-bottom:0">
				</div>
				<div style="flex:0 0 220px">
					<label for="dateTimePrecisionMS">Timestamp Precision (ms)</label>
					<input type="number" id="dateTimePrecisionMS" value="1000" min="0" max="60000" style="margin-bottom:0">
				</div>
				<div style="flex:0 0 auto; display:flex; gap:8px">
					<button class="success" style="margin:0" onclick="pict.views['DataCloner-Sync'].startSync()">Start Sync</button>
					<button class="danger" style="margin:0" onclick="pict.views['DataCloner-Sync'].stopSync()">Stop Sync</button>
				</div>
			</div>
			<div style="font-size:0.8em; color:#888; margin-bottom:10px; padding-left:158px">Cross-DB tolerance for date comparison (default: 1000ms)</div>

			<div style="margin-bottom:10px">
				<label style="margin-bottom:6px">Sync Mode</label>
				<div style="display:flex; gap:16px; align-items:center">
					<label style="font-weight:normal; margin:0; cursor:pointer">
						<input type="radio" name="syncMode" id="syncModeInitial" value="Initial" checked> Initial
						<span style="color:#888; font-size:0.85em">(full clone — download all records)</span>
					</label>
					<label style="font-weight:normal; margin:0; cursor:pointer">
						<input type="radio" name="syncMode" id="syncModeOngoing" value="Ongoing"> Ongoing
						<span style="color:#888; font-size:0.85em">(delta — only new/updated records since last sync)</span>
					</label>
				</div>
			</div>

			<div class="checkbox-row">
				<input type="checkbox" id="syncDeletedRecords">
				<label for="syncDeletedRecords">Sync deleted records (fetch records marked Deleted=1 on source and mirror locally)</label>
			</div>

			<div id="syncStatus"></div>
			<div id="syncProgress"></div>

			<!-- Sync Report (appears after sync completes) -->
			<div id="syncReportSection" style="display:none; margin-top:16px; padding-top:16px; border-top:2px solid #ddd">
				<h3 style="margin:0 0 12px; font-size:1.1em">Sync Report</h3>

				<!-- Summary cards -->
				<div id="reportSummaryCards" style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px"></div>

				<!-- Anomalies -->
				<div id="reportAnomalies" style="margin-bottom:16px"></div>

				<!-- Top tables by duration -->
				<div id="reportTopTables" style="margin-bottom:16px"></div>

				<!-- Buttons -->
				<div style="display:flex; gap:8px">
					<button class="secondary" onclick="pict.views['DataCloner-Sync'].downloadReport()">Download Report JSON</button>
					<button class="secondary" onclick="pict.views['DataCloner-Sync'].copyReport()">Copy Report</button>
				</div>
				<div id="reportStatus"></div>
			</div>
		</div>
	</div>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'DataCloner-Sync',
          TemplateHash: 'DataCloner-Sync',
          DestinationAddress: '#DataCloner-Section-Sync'
        }]
      };
    }, {
      "pict-view": 8
    }],
    20: [function (require, module, exports) {
      const libPictView = require('pict-view');
      class DataClonerViewDataView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        populateViewTableDropdown() {
          let tmpSelect = document.getElementById('viewTable');
          if (!tmpSelect) return;
          let tmpCurrentValue = tmpSelect.value;
          tmpSelect.innerHTML = '';
          let tmpDeployedTables = this.pict.AppData.DataCloner.DeployedTables;
          if (!tmpDeployedTables || tmpDeployedTables.length === 0) {
            let tmpOpt = document.createElement('option');
            tmpOpt.value = '';
            tmpOpt.textContent = '\u2014 deploy tables first \u2014';
            tmpSelect.appendChild(tmpOpt);
            return;
          }
          for (let i = 0; i < tmpDeployedTables.length; i++) {
            let tmpOpt = document.createElement('option');
            tmpOpt.value = tmpDeployedTables[i];
            tmpOpt.textContent = tmpDeployedTables[i];
            tmpSelect.appendChild(tmpOpt);
          }

          // Restore previous selection if it exists
          if (tmpCurrentValue) {
            tmpSelect.value = tmpCurrentValue;
          }
        }
        loadTableData() {
          let tmpTable = document.getElementById('viewTable').value;
          let tmpLimit = parseInt(document.getElementById('viewLimit').value, 10) || 100;
          if (!tmpTable) {
            this.pict.providers.DataCloner.setStatus('viewStatus', 'Select a table first.', 'error');
            return;
          }
          this.pict.providers.DataCloner.setStatus('viewStatus', 'Loading ' + tmpTable + '...', 'info');
          document.getElementById('viewDataContainer').innerHTML = '';
          let tmpSelf = this;
          // Use the standard Meadow CRUD list endpoint: /1.0/{Entity}s/0/{Cap}
          this.pict.providers.DataCloner.api('GET', '/1.0/' + tmpTable + 's/0/' + tmpLimit).then(function (pData) {
            if (!Array.isArray(pData)) {
              tmpSelf.pict.providers.DataCloner.setStatus('viewStatus', 'Unexpected response (not an array). The table may not be deployed yet.', 'error');
              return;
            }
            tmpSelf.pict.providers.DataCloner.setStatus('viewStatus', pData.length + ' row(s) returned' + (pData.length >= tmpLimit ? ' (limit reached \u2014 increase Max Rows to see more)' : '') + '.', 'ok');
            tmpSelf.renderDataTable(pData);
          }).catch(function (pError) {
            tmpSelf.pict.providers.DataCloner.setStatus('viewStatus', 'Request failed: ' + pError.message, 'error');
          });
        }
        renderDataTable(pRows) {
          let tmpContainer = document.getElementById('viewDataContainer');
          if (!pRows || pRows.length === 0) {
            tmpContainer.innerHTML = '<p style="color:#666; font-size:0.9em; padding:8px">No rows.</p>';
            return;
          }

          // Collect all column names from the first row
          let tmpColumns = Object.keys(pRows[0]);
          let tmpHtml = '<table class="data-table">';
          tmpHtml += '<thead><tr>';
          for (let c = 0; c < tmpColumns.length; c++) {
            tmpHtml += '<th>' + this.pict.providers.DataCloner.escapeHtml(tmpColumns[c]) + '</th>';
          }
          tmpHtml += '</tr></thead>';
          tmpHtml += '<tbody>';
          for (let r = 0; r < pRows.length; r++) {
            tmpHtml += '<tr>';
            for (let c = 0; c < tmpColumns.length; c++) {
              let tmpVal = pRows[r][tmpColumns[c]];
              let tmpDisplay = tmpVal === null || tmpVal === undefined ? '' : String(tmpVal);
              tmpHtml += '<td title="' + this.pict.providers.DataCloner.escapeHtml(tmpDisplay) + '">' + this.pict.providers.DataCloner.escapeHtml(tmpDisplay) + '</td>';
            }
            tmpHtml += '</tr>';
          }
          tmpHtml += '</tbody></table>';
          tmpContainer.innerHTML = tmpHtml;
        }
      }
      module.exports = DataClonerViewDataView;
      module.exports.default_configuration = {
        ViewIdentifier: 'DataCloner-ViewData',
        DefaultRenderable: 'DataCloner-ViewData',
        DefaultDestinationAddress: '#DataCloner-Section-ViewData',
        CSS: /*css*/`
.data-table { width: 100%; border-collapse: collapse; font-size: 0.8em; font-family: monospace; }
.data-table th { background: #f8f9fa; font-weight: 600; text-align: left; padding: 4px 8px; border: 1px solid #ddd; white-space: nowrap; position: sticky; top: 0; }
.data-table td { padding: 4px 8px; border: 1px solid #eee; white-space: nowrap; max-width: 300px; overflow: hidden; text-overflow: ellipsis; }
.data-table tr:nth-child(even) { background: #fafafa; }
.data-table tr:hover { background: #f0f7ff; }
`,
        Templates: [{
          Hash: 'DataCloner-ViewData',
          Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">7</div>
	<div class="accordion-card" id="section7" data-section="7">
		<div class="accordion-header" onclick="pict.views['DataCloner-Layout'].toggleSection('section7')">
			<div class="accordion-title">View Data</div>
			<div class="accordion-preview" id="preview7">Browse synced table data</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<div class="inline-group">
				<div style="flex:1">
					<label for="viewTable">Table</label>
					<select id="viewTable">
						<option value="">\u2014 deploy tables first \u2014</option>
					</select>
				</div>
				<div style="flex:0 0 120px">
					<label for="viewLimit">Max Rows</label>
					<input type="number" id="viewLimit" value="100" min="1" max="10000">
				</div>
				<div style="flex:0 0 auto; display:flex; align-items:flex-end">
					<button class="primary" onclick="pict.views['DataCloner-ViewData'].loadTableData()">Load</button>
				</div>
			</div>
			<div id="viewStatus"></div>
			<div id="viewDataContainer" style="overflow-x:auto; margin-top:10px"></div>
		</div>
	</div>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'DataCloner-ViewData',
          TemplateHash: 'DataCloner-ViewData',
          DestinationAddress: '#DataCloner-Section-ViewData'
        }]
      };
    }, {
      "pict-view": 8
    }]
  }, {}, [11])(11);
});
//# sourceMappingURL=data-cloner.js.map
