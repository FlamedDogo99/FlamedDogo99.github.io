import runAddonUserscripts from "./run-userscript.js";
import Localization from "./l10n.js";
import "../../libraries/thirdparty/cs/comlink.js";

window.scratchAddons = {};
scratchAddons.classNames = { loaded: false };
scratchAddons.eventTargets = {
  auth: [],
  settings: [],
  tab: [],
  self: [],
};
scratchAddons.session = {};
scratchAddons.loadedScripts = {};
scratchAddons.globalState = {
    "auth": {
        "isLoggedIn": false,
        "username": null,
        "userId": null,
        "xToken": null,
        "csrfToken": "PXmORVGdaALqsoCyPU9eVbz50vka5hwc",
        "scratchLang": "en-US"
    },
    "addonSettings": {
        "60fps": {
            "framerate": 60
        },
        "better-featured-project": {
            "blur": 0
        },
        "better-img-uploads": {
            "fitting": "fit"
        },
        "block-cherry-picking": {
            "invertDrag": false
        },
        "block-switching": {
            "control": true,
            "customargs": true,
            "customargsmode": "defOnly",
            "data": true,
            "event": true,
            "extension": true,
            "looks": true,
            "motion": true,
            "noop": true,
            "operator": true,
            "sa": true,
            "sensing": true,
            "sound": true
        },
        "cat-blocks": {
            "watch": false
        },
        "clones": {
            "projectpage": true,
            "showicononly": false
        },
        "cloud-games": {
            "displayedGames": [
                {
                    "url": "https://scratch.mit.edu/studios/539952/"
                }
            ]
        },
        "collapse-footer": {
            "infiniteScroll": false,
            "speed": "default"
        },
        "colorblind": {
            "links": "underline",
            "underline-style": "solid"
        },
        "comments-linebreaks": {
            "height": 5,
            "scrollbars": true
        },
        "compact-messages": {
            "comment_padding": 5,
            "hide_icons": true,
            "message_padding": 5,
            "no_borders": false
        },
        "confirm-actions": {
            "cancelcomment": true,
            "closingtopic": false,
            "followinguser": false,
            "joiningstudio": false,
            "projectsharing": true,
            "projectunsharing": true,
            "removingprojects": true
        },
        "ctrl-enter-post": {
            "comments": true,
            "forums": false
        },
        "curator-link": {
            "styleAsNormalText": true
        },
        "custom-block-shape": {
            "cornerSize": 100,
            "notchSize": 100,
            "paddingSize": 100
        },
        "custom-block-text": {
            "bold": false,
            "shadow": false,
            "size": 100
        },
        "custom-zoom": {
            "autohide": false,
            "maxZoom": 300,
            "minZoom": 1,
            "speed": "default",
            "startZoom": 68,
            "zoomSpeed": 100
        },
        "customize-avatar-border": {
            "fill-transparent": false,
            "hide-outline": false,
            "outline-color": "#4d97ff40"
        },
        "dark-www": {
            "_appliedVersions": [
                1,
                2,
                3,
                6
            ],
            "_version": 7,
            "blue": "#e9f1fc",
            "border": "#0000001a",
            "box": "#ffffff",
            "button": "#4d97ff",
            "darkBanners": "off",
            "darkForumCode": false,
            "footer": "#f2f2f2",
            "gray": "#f2f2f2",
            "input": "#fafafa",
            "link": "#4d97ff",
            "messageIndicatorColor": "#ffab1a",
            "messageIndicatorOnMessagesPage": "#ffab1a",
            "navbar": "#4d97ff",
            "page": "#fcfcfc"
        },
        "data-category-tweaks-v2": {
            "moveReportersDown": false,
            "separateListCategory": true,
            "separateLocalVariables": true
        },
        "debugger": {
            "fancy_graphs": false,
            "log_broadcasts": false,
            "log_clear_greenflag": false,
            "log_clone_create": false,
            "log_failed_clone_creation": true,
            "log_greenflag": false,
            "log_invalid_cloud_data": false,
            "log_max_list_length": true
        },
        "default-costume-editor-color": {
            "fill": "#9966FF",
            "persistence": true,
            "stroke": "#000000",
            "strokeSize": 4
        },
        "default-project": {
            "projectId": 510186917
        },
        "disable-sprite-wobble": {
            "mode": "none"
        },
        "disable-stage-drag-select": {
            "drag_while_stopped": true
        },
        "discuss-button": {
            "compact-nav": true,
            "items": [
                {
                    "name": "Create",
                    "url": "/projects/editor/"
                },
                {
                    "name": "Explore",
                    "url": "/explore/projects/all"
                },
                {
                    "name": "About",
                    "url": "/about"
                },
                {
                    "name": "My Stuff",
                    "url": "/mystuff"
                },
                {
                    "name": "Discuss",
                    "url": "/discuss"
                }
            ],
            "stick": "screen"
        },
        "drag-drop": {
            "use-hd-upload": true
        },
        "editor-comment-previews": {
            "delay": "short",
            "follow-mouse": true,
            "hover-view": true,
            "hover-view-block": true,
            "hover-view-procedure": true,
            "reduce-animation": false,
            "reduce-transparency": false
        },
        "editor-compact": {
            "hideLabels": true
        },
        "editor-dark-mode": {
            "_appliedVersions": [
                8
            ],
            "_version": 10,
            "accent": "#111111",
            "activeTab": "#1e1e1e",
            "affectPaper": true,
            "affectStage": false,
            "border": "#ffffff26",
            "categoryMenu": "#111111",
            "dots": true,
            "fullscreen": "#111111",
            "highlightText": "#ff4d4d",
            "input": "#1e1e1e",
            "menuBar": "#333333",
            "page": "#111111",
            "palette": "#111111cc",
            "popup": "#333a",
            "primary": "#ff4d4d",
            "selector": "#1e1e1e",
            "selector2": "#2e2e2e",
            "selectorSelection": "#111111",
            "stageHeader": "#111111",
            "tab": "#2e2e2e",
            "workspace": "#1e1e1e"
        },
        "editor-devtools": {
            "enableCleanUpPlus": true,
            "enablePasteBlocksAtMouse": true
        },
        "editor-extra-keys": {
            "experimentalKeys": true,
            "shiftKeys": true
        },
        "editor-number-arrow-keys": {
            "alt": "tenth",
            "altCustom": "0.1",
            "regular": "one",
            "regularCustom": "1",
            "shift": "ten",
            "shiftCustom": "10",
            "useCustom": false
        },
        "editor-stepping": {
            "highlight-color": "#0000ff"
        },
        "editor-theme3": {
            "Pen-color": "#0FBD8C",
            "_version": 3,
            "comment-color": "#FEF49C",
            "control-color": "#FFAB19",
            "custom-color": "#FF6680",
            "data-color": "#FF8C1A",
            "data-lists-color": "#FF661A",
            "events-color": "#FFBF00",
            "forums": false,
            "input-color": "#FFFFFF",
            "looks-color": "#9966FF",
            "motion-color": "#4C97FF",
            "operators-color": "#59C059",
            "sa-color": "#29BEB8",
            "sensing-color": "#5CB1D6",
            "sounds-color": "#CF63CF",
            "text": "white"
        },
        "exact-count": {
            "forumuser": false,
            "studio": true,
            "user": true
        },
        "expanded-backpack": {
            "rows": 2,
            "upscale": true
        },
        "fix-editor-comments": {
            "fix-drag": true,
            "leash": true,
            "scroll": true,
            "standalone-edit": true,
            "straighten": false
        },
        "forum-id": {
            "auto_add": false
        },
        "forum-live-preview": {
            "rate": "default"
        },
        "forum-quote-code-beautifier": {
            "_appliedVersions": [
                1
            ],
            "_version": 1,
            "bordercolor": "#855cd6"
        },
        "forum-toolbar": {
            "center": true,
            "code": true,
            "color": true,
            "dictionary": false,
            "google": false,
            "wiki": true,
            "wp": false
        },
        "full-signature": {
            "blocks": true,
            "signature": true,
            "whathappen": true,
            "whatworkingon": true
        },
        "fullscreen": {
            "browserFullscreen": true,
            "hideToolbar": false
        },
        "gamepad": {
            "hide": false
        },
        "hi-res-thumbnails": {
            "multiplier": 200
        },
        "hide-delete-button": {
            "costumes": true,
            "sounds": true,
            "sprites": true
        },
        "hide-flyout": {
            "speed": "default",
            "toggle": "cathover"
        },
        "hide-project-stats": {
            "comments": true,
            "favorites": true,
            "loves": true,
            "lovesFront": true,
            "myStuff": false,
            "remixes": true,
            "remixesFront": true,
            "showOwnStats": false,
            "studios": true,
            "views": true
        },
        "hide-signatures": {
            "hide": true,
            "toggle": true
        },
        "infinite-scroll": {
            "forumScroll": true,
            "messageScroll": true,
            "profileCommentScroll": true,
            "projectScroll": true,
            "studioActivityScroll": true,
            "studioBrowseProjectScroll": true,
            "studioCuratorScroll": true,
            "studioProjectScroll": true,
            "studioScroll": true
        },
        "initialise-sprite-position": {
            "duplicate": "randomize",
            "library": false,
            "x": 0,
            "y": 0
        },
        "items-per-row": {
            "projects": 5,
            "search": 4,
            "studioCurators": 3,
            "studioProjects": 3,
            "studios": 4,
            "users": 11
        },
        "live-featured-project": {
            "alternativePlayer": "none",
            "autoPlay": false,
            "enableTWAddons": true,
            "shareUsername": true,
            "showMenu": false
        },
        "load-extensions": {
            "music": true,
            "pen": true,
            "text2speech": false,
            "translate": false
        },
        "middle-click-popup": {
            "popup_max_height": 40,
            "popup_scale": 48,
            "popup_width": 16
        },
        "msg-count-badge": {
            "color": "#008000",
            "showOffline": false
        },
        "my-ocular": {
            "discuss": false,
            "profile": false,
            "reactions": true,
            "show-status": "others"
        },
        "necropost-highlighter": {
            "applyToBugsAndGlitches": true,
            "applyToHelpWithScripts": true,
            "applyToNewScratchers": true,
            "applyToOpenSourceProjects": false,
            "applyToProjectIdeas": true,
            "applyToQuestionsAboutScratch": true,
            "applyToRequests": false,
            "applyToSuggestions": false,
            "chooseCustomForums": false,
            "colorTopicCells": true,
            "monthCountConsideredOld": 1
        },
        "old-studio-layout": {
            "version": "default"
        },
        "onion-skinning": {
            "afterTint": "#0000FF",
            "beforeTint": "#FF0000",
            "default": false,
            "layering": "front",
            "mode": "merge",
            "next": 0,
            "opacity": 25,
            "opacityStep": 10,
            "previous": 1
        },
        "paint-by-default": {
            "backdrop": "paint",
            "costume": "paint",
            "sound": "upload",
            "sprite": "paint"
        },
        "paint-snap": {
            "boxCenter": true,
            "boxCorners": false,
            "boxEdgeMids": false,
            "enable-default": true,
            "guide-color": "#ff0000",
            "objectCenters": true,
            "objectCorners": true,
            "objectEdges": true,
            "objectMidlines": true,
            "pageAxes": true,
            "pageCenter": true,
            "pageCorners": false,
            "pageEdges": true,
            "threshold": 10
        },
        "progress-bar": {
            "height": 8,
            "topbar": false
        },
        "project-info": {
            "show": "both"
        },
        "scratch-notifier": {
            "becomehoststudio_notifications": true,
            "becomeownerstudio_notifications": true,
            "commentsforme_notifications": true,
            "commentsonmyprojects_notifications": true,
            "curatorinvite_notifications": true,
            "favoriteproject_notifications": true,
            "followuser_notifications": true,
            "forumpost_notifications": true,
            "loveproject_notifications": true,
            "mark_as_read_when_clicked": true,
            "notification_sound": "system-default",
            "remixproject_notifications": true,
            "studioactivity_notifications": true
        },
        "scratchr2": {
            "postStyle": "box"
        },
        "script-snap": {
            "grid": 40
        },
        "sprite-properties": {
            "autoCollapse": false,
            "hideByDefault": true,
            "transitionDuration": "default"
        },
        "studio-tools": {
            "mystufftools": true
        },
        "transparent-orphans": {
            "block": 0,
            "dragged": 25,
            "orphan": 25
        },
        "turbowarp-player": {
            "action": "link",
            "addons": true
        },
        "user-id": {
            "only-on-hover": true
        },
        "vol-slider": {
            "always": false,
            "defVol": 100
        },
        "zebra-striping": {
            "intensity": 10,
            "shade": "lighter"
        }
    }
}
const consoleOutput = (logAuthor = "[page]") => {
  const style = {
    // Remember to change these as well on cs.js
    leftPrefix: "background:  #ff7b26; color: white; border-radius: 0.5rem 0 0 0.5rem; padding: 0 0.5rem",
    rightPrefix:
      "background: #222; color: white; border-radius: 0 0.5rem 0.5rem 0; padding: 0 0.5rem; font-weight: bold",
    text: "",
  };
  return [`%cSA%c${logAuthor}%c`, style.leftPrefix, style.rightPrefix, style.text];
};
scratchAddons.console = {
  log: _realConsole.log.bind(_realConsole, ...consoleOutput()),
  warn: _realConsole.warn.bind(_realConsole, ...consoleOutput()),
  error: _realConsole.error.bind(_realConsole, ...consoleOutput()),
  logForAddon: (addonId) => _realConsole.log.bind(_realConsole, ...consoleOutput(addonId)),
  warnForAddon: (addonId) => _realConsole.warn.bind(_realConsole, ...consoleOutput(addonId)),
  errorForAddon: (addonId) => _realConsole.error.bind(_realConsole, ...consoleOutput(addonId)),
};

const comlinkIframe1 = document.getElementById("scratchaddons-iframe-1");
const comlinkIframe2 = document.getElementById("scratchaddons-iframe-2");
const comlinkIframe3 = document.getElementById("scratchaddons-iframe-3");
const comlinkIframe4 = document.getElementById("scratchaddons-iframe-4");
const _cs_ = Comlink.wrap(Comlink.windowEndpoint(comlinkIframe2.contentWindow, comlinkIframe1.contentWindow));

const page = {
  _globalState: null,
  get globalState() {
    return this._globalState;
  },
  set globalState(val) {
    this._globalState = scratchAddons.globalState = val;
  },

  l10njson: null, // Only set once
  addonsWithUserscripts: null, // Only set once

  _dataReady: false,
  get dataReady() {
    return this._dataReady;
  },
  set dataReady(val) {
    this._dataReady = val;
    onDataReady(); // Assume set to true
    this.refetchSession();
  },

//runAddonUserscripts, // Gets called by cs.js when addon enabled late

  fireEvent(info) {
    if (info.addonId) {
      if (info.name === "disabled") {
        document.documentElement.style.setProperty(
          `--${info.addonId.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}-_displayNoneWhileDisabledValue`,
          "none"
        );
      } else if (info.name === "reenabled") {
        document.documentElement.style.removeProperty(
          `--${info.addonId.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}-_displayNoneWhileDisabledValue`
        );
      }

      // Addon specific events, like settings change and self disabled
      const eventTarget = scratchAddons.eventTargets[info.target].find(
        (eventTarget) => eventTarget._addonId === info.addonId
      );
      if (eventTarget) eventTarget.dispatchEvent(new CustomEvent(info.name));
    } else {
      // Global events, like auth change
      scratchAddons.eventTargets[info.target].forEach((eventTarget) =>
        eventTarget.dispatchEvent(new CustomEvent(info.name))
      );
    }
  },
  isFetching: false,
  async refetchSession() {
    if (true) return;
    let res;
    let d;
    if (this.isFetching) return;
    this.isFetching = true;
    scratchAddons.eventTargets.auth.forEach((auth) => auth._refresh());
    try {
      res = await fetch("/session/", {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      d = await res.json();
    } catch (e) {
      d = {};
      scratchAddons.console.warn("Session fetch failed: ", e);
      if ((res && !res.ok) || !res) setTimeout(() => this.refetchSession(), 60000);
    }
    scratchAddons.session = d;
    scratchAddons.eventTargets.auth.forEach((auth) => auth._update(d));
    this.isFetching = false;
  },
};
Comlink.expose(page, Comlink.windowEndpoint(comlinkIframe4.contentWindow, comlinkIframe3.contentWindow));

class SharedObserver {
  constructor() {
    this.inactive = true;
    this.pending = new Set();
    this.observer = new MutationObserver((mutation, observer) => {
      for (const item of this.pending) {
        if (item.condition && !item.condition()) continue;
        for (const match of document.querySelectorAll(item.query)) {
          if (item.seen?.has(match)) continue;
          if (item.elementCondition && !item.elementCondition(match)) continue;
          item.seen?.add(match);
          this.pending.delete(item);
          item.resolve(match);
          break;
        }
      }
      if (this.pending.size === 0) {
        this.inactive = true;
        this.observer.disconnect();
      }
    });
  }

  /**
   * Watches an element.
   * @param {object} opts - options
   * @param {string} opts.query - query.
   * @param {WeakSet=} opts.seen - a WeakSet that tracks whether an element has already been seen.
   * @param {function=} opts.condition - a function that returns whether to resolve the selector or not.
   * @param {function=} opts.elementCondition - A function that returns whether to resolve the selector or not, given an element.
   * @returns {Promise<Node>} Promise that is resolved with modified element.
   */
  watch(opts) {
    if (this.inactive) {
      this.inactive = false;
      this.observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
      });
    }
    return new Promise((resolve) =>
      this.pending.add({
        resolve,
        ...opts,
      })
    );
  }
}

//onDataReady();


function onDataReady() {
  const addons = [
    {
        "addonId": "editor-searchable-dropdowns",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "editor-devtools",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "discuss-button",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": false
            },
            {
                "url": "www.js",
                "runAtComplete": false
            }
        ]
    },
    {
        "addonId": "remove-sprite-confirm",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "true-youtube-links",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": false
            }
        ]
    },
    {
        "addonId": "progress-bar",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": false
            }
        ]
    },
    {
        "addonId": "remix-tree-button",
        "scripts": [
            {
                "url": "main.js",
                "runAtComplete": false
            }
        ]
    },
    {
        "addonId": "bitmap-copy",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "more-links",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "better-emojis",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "last-edit-tooltip",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "infinite-scroll",
        "scripts": [
            {
                "url": "buttonScroll.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "mouse-pos",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "clones",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "editor-messages",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "pause",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "animated-thumb",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "fix-uploaded-svgs",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": false
            }
        ]
    },
    {
        "addonId": "confirm-actions",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": false
            }
        ]
    },
    {
        "addonId": "block-switching",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "color-picker",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "onion-skinning",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "data-category-tweaks-v2",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": false
            }
        ]
    },
    {
        "addonId": "hide-flyout",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "copy-message-link",
        "scripts": [
            {
                "url": "project.js",
                "runAtComplete": false
            }
        ]
    },
    {
        "addonId": "variable-manager",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "drag-drop",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "custom-zoom",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "blocks2image",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "fix-pasted-scripts",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "better-img-uploads",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "expanding-search-bar",
        "scripts": [
            {
                "url": "expanding-search-bar.js",
                "runAtComplete": false
            }
        ]
    },
    {
        "addonId": "debugger",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "disable-stage-drag-select",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "turbowarp-player",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "ctrl-enter-post",
        "scripts": [
            {
                "url": "comments.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "no-script-bumping",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "name-backpack-items",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "paint-by-default",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "editor-unshare-button",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "editor-extra-keys",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "remix-button",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "block-cherry-picking",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "hide-new-variables",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "move-to-top-bottom",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "block-duplicate",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "disable-paste-offset",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "emoji-picker",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "editor-comment-previews",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "swap-local-global",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "fix-editor-comments",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "color-inputs",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "sounds-duration",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "opacity-slider",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "remove-search-bar-autocomplete",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": false
            }
        ]
    },
    {
        "addonId": "zebra-striping",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "find-bar",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "jump-to-def",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "paint-snap",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": false
            }
        ]
    },
    {
        "addonId": "pick-colors-from-stage",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "rename-broadcasts",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "middle-click-popup",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "editor-random-direction-block",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "copy-reporter",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "faster-project-loading",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": false
            }
        ]
    },
    {
        "addonId": "op-badge",
        "scripts": [
            {
                "url": "projects.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "editor-number-arrow-keys",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "paint-skew",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "preview-project-description",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "hide-stage",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "editor-dark-mode",
        "scripts": [
            {
                "url": "bubbles.js",
                "runAtComplete": true
            },
            {
                "url": "paper.js",
                "runAtComplete": false
            },
            {
                "url": "extension_icons.js",
                "runAtComplete": true
            },
            {
                "url": "paint_icons.js",
                "runAtComplete": true
            }
        ]
    },
    {
        "addonId": "editor-colored-context-menus",
        "scripts": [
            {
                "url": "userscript.js",
                "runAtComplete": true
            }
        ]
    }
];

  scratchAddons.l10n = new Localization(page.l10njson);

  scratchAddons.methods = {};
  scratchAddons.methods.copyImage = async (dataURL) => {
    return _cs_.copyImage(dataURL);
  };
  scratchAddons.methods.getEnabledAddons = (tag) => _cs_.getEnabledAddons(tag);

  scratchAddons.sharedObserver = new SharedObserver();

  const runUserscripts = () => {
    for (const addon of addons) {
      if (addon.scripts.length) runAddonUserscripts(addon);
    }
  };

  // Note: we currently load userscripts and locales after head loaded
  // We could do that before head loaded just fine, as long as we don't
  // actually *run* the addons before document.head is defined.
  if (document.head) runUserscripts();
  else {
    const observer = new MutationObserver(() => {
      if (document.head) {
        runUserscripts();
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { subtree: true, childList: true });
  }
}

function bodyIsEditorClassCheck() {
  if (location.origin === "https://scratchfoundation.github.io" || location.port === "8601")
    return document.body.classList.add("sa-body-editor");
  const pathname = location.pathname.toLowerCase();
  const split = pathname.split("/").filter(Boolean);
  if (!split[0] || split[0] !== "projects") return;
  if (split.includes("editor") || split.includes("fullscreen")) document.body.classList.add("sa-body-editor");
  else document.body.classList.remove("sa-body-editor");
}
if (!document.body) document.addEventListener("DOMContentLoaded", bodyIsEditorClassCheck);
else bodyIsEditorClassCheck();

const originalReplaceState = history.replaceState;
history.replaceState = function () {
  const oldUrl = location.href;
  const newUrl = arguments[2] ? new URL(arguments[2], document.baseURI).href : oldUrl;
  const returnValue = originalReplaceState.apply(history, arguments);
  _cs_.url = newUrl;
  for (const eventTarget of scratchAddons.eventTargets.tab) {
    eventTarget.dispatchEvent(new CustomEvent("urlChange", { detail: { oldUrl, newUrl } }));
  }
  bodyIsEditorClassCheck();
  return returnValue;
};

const originalPushState = history.pushState;
history.pushState = function () {
  const oldUrl = location.href;
  const newUrl = arguments[2] ? new URL(arguments[2], document.baseURI).href : oldUrl;
  const returnValue = originalPushState.apply(history, arguments);
  _cs_.url = newUrl;
  for (const eventTarget of scratchAddons.eventTargets.tab) {
    eventTarget.dispatchEvent(new CustomEvent("urlChange", { detail: { oldUrl, newUrl } }));
  }
  bodyIsEditorClassCheck();
  return returnValue;
};

// replaceState or pushState will not trigger onpopstate.
window.addEventListener("popstate", () => {
  const newUrl = (_cs_.url = location.href);
  for (const eventTarget of scratchAddons.eventTargets.tab) {
    // There isn't really a way to get the previous URL from popstate event.
    eventTarget.dispatchEvent(new CustomEvent("urlChange", { detail: { oldUrl: "", newUrl } }));
  }
  bodyIsEditorClassCheck();
});

function loadClasses() {
  scratchAddons.classNames.arr = [
    ...new Set(
      [...document.styleSheets]
        .filter(
          (styleSheet) =>
            !(
              styleSheet.ownerNode.textContent.startsWith(
                "/* DO NOT EDIT\n@todo This file is copied from GUI and should be pulled out into a shared library."
              ) &&
              (styleSheet.ownerNode.textContent.includes("input_input-form") ||
                styleSheet.ownerNode.textContent.includes("label_input-group_"))
            )
        )
        .map((e) => {
          try {
            return [...e.cssRules];
          } catch (e) {
            return [];
          }
        })
        .flat()
        .map((e) => e.selectorText)
        .filter((e) => e)
        .map((e) => e.match(/(([\w-]+?)_([\w-]+)_([\w\d-]+))/g))
        .filter((e) => e)
        .flat()
    ),
  ];
  scratchAddons.classNames.loaded = true;
  window.dispatchEvent(new CustomEvent("scratchAddonsClassNamesReady"));
}

const isProject =
  location.pathname.split("/")[1] === "projects" &&
  !["embed", "remixes", "studios"].includes(location.pathname.split("/")[3]);
const isScratchGui = location.origin === "https://scratchfoundation.github.io" || location.port === "8601";
if (isScratchGui || isProject) {
  // Stylesheets are considered to have loaded if this element exists
  const elementSelector = isScratchGui ? "div[class*=index_app_]" : ":root > body > .ReactModalPortal";

  if (document.querySelector(elementSelector)) loadClasses();
  else {
    let foundElement = false;
    const stylesObserver = new MutationObserver((mutationsList) => {
      if (document.querySelector(elementSelector)) {
        foundElement = true;
        stylesObserver.disconnect();
        loadClasses();
      }
    });
    stylesObserver.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => {
      if (!foundElement) scratchAddons.console.log("Did not find elementSelector element after 10 seconds.");
    }, 10000);
  }
}

if (location.pathname === "/discuss/3/topic/add/") {
  const checkUA = () => {
    if (!window.mySettings) return false;
    const ua = window.mySettings.markupSet.find((x) => x.className);
    ua.openWith = window._simple_http_agent = ua.openWith.replace("version", "versions");
    const textarea = document.getElementById("id_body");
    if (textarea?.value) {
      textarea.value = ua.openWith;
      return true;
    }
  };
  if (!checkUA()) window.addEventListener("DOMContentLoaded", () => checkUA(), { once: true });
}
