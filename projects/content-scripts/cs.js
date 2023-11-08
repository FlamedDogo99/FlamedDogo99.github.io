import runAddonUserscripts from "./inject/run-userscript.js";

try {
  // Property window.top.location.origin matches the origin that corresponds to
  // the URL displayed on the address bar, for this tab.
  // Meanwhile, window.location.origin can only correspond to one of the content
  // script matches which are declared in the manifest.json file. In normal use,
  // it will always equal `https://scratch.mit.edu`.
  if (window.top.location.origin !== window.location.origin) throw "";
} catch {
  throw "Scratch Addons: cross-origin iframe ignored";
}
if (window.frameElement && window.frameElement.getAttribute("src") === null)
  throw "Scratch Addons: iframe without src attribute ignored";
if (document.documentElement instanceof SVGElement) throw "Scratch Addons: SVG document ignored";

const MAX_USERSTYLES_PER_ADDON = 100;

const _realConsole = window.console;
const consoleOutput = (logAuthor = "[cs]") => {
  const style = {
    // Remember to change these as well on module.js
    leftPrefix: "background:  #ff7b26; color: white; border-radius: 0.5rem 0 0 0.5rem; padding: 0 0.5rem",
    rightPrefix:
      "background: #222; color: white; border-radius: 0 0.5rem 0.5rem 0; padding: 0 0.5rem; font-weight: bold",
    text: "",
  };
  return [`%cSA%c${logAuthor}%c`, style.leftPrefix, style.rightPrefix, style.text];
};
const console = {
  ..._realConsole,
  log: _realConsole.log.bind(_realConsole, ...consoleOutput()),
  warn: _realConsole.warn.bind(_realConsole, ...consoleOutput()),
  error: _realConsole.error.bind(_realConsole, ...consoleOutput()),
};

let pseudoUrl; // Fake URL to use if response code isn't 2xx

let receivedResponse = true;


const DOLLARS = ["$1", "$2", "$3", "$4", "$5", "$6", "$7", "$8", "$9"];

const promisify =
  (callbackFn) =>
  (...args) =>
    new Promise((resolve) => callbackFn(...args, resolve));

let _page_ = null;
let globalState = null;

const comlinkIframesDiv = document.createElement("div");
comlinkIframesDiv.id = "scratchaddons-iframes";
const comlinkIframe1 = document.createElement("iframe");
comlinkIframe1.id = "scratchaddons-iframe-1";
comlinkIframe1.style.display = "none";
const comlinkIframe2 = comlinkIframe1.cloneNode();
comlinkIframe2.id = "scratchaddons-iframe-2";
const comlinkIframe3 = comlinkIframe1.cloneNode();
comlinkIframe3.id = "scratchaddons-iframe-3";
const comlinkIframe4 = comlinkIframe1.cloneNode();
comlinkIframe4.id = "scratchaddons-iframe-4";
comlinkIframesDiv.appendChild(comlinkIframe1);
comlinkIframesDiv.appendChild(comlinkIframe2);
comlinkIframesDiv.appendChild(comlinkIframe3);
comlinkIframesDiv.appendChild(comlinkIframe4);
document.documentElement.appendChild(comlinkIframesDiv);

const csUrlObserver = new EventTarget();
const cs = {
  _url: location.href, // Updated by module.js on calls to history.replaceState/pushState
  get url() {
    return this._url;
  },
  set url(newUrl) {
    this._url = newUrl;
    csUrlObserver.dispatchEvent(new CustomEvent("change", { detail: { newUrl } }));
  },
  copyImage(dataURL) {
    // Firefox only
    return new Promise((resolve, reject) => {
      browser.runtime.sendMessage({ clipboardDataURL: dataURL }).then(
        (res) => {
          resolve();
        },
        (res) => {
          reject(res.toString());
        }
      );
    });
  },
  getEnabledAddons(tag) {
    // Return addons that are enabled
    return new Promise((resolve) => {
//      chrome.runtime.sendMessage(
//        {
//          getEnabledAddons: {
//            tag,
//          },
//        },
//        (res) => resolve(res)
//      );
    });
  },
};
Comlink.expose(cs, Comlink.windowEndpoint(comlinkIframe1.contentWindow, comlinkIframe2.contentWindow));

const moduleScript = document.createElement("script");
moduleScript.type = "module";
moduleScript.src = "content-scripts/inject/module.js";

(async () => {
  await new Promise((resolve) => {
    moduleScript.addEventListener("load", resolve);
  });
  _page_ = Comlink.wrap(Comlink.windowEndpoint(comlinkIframe3.contentWindow, comlinkIframe4.contentWindow));
})();
console.log("TESTTESTTEST");
document.documentElement.appendChild(moduleScript);

let initialUrl = location.href;
let path = new URL(initialUrl).pathname.substring(1);
if (path[path.length - 1] !== "/") path += "/";
const pathArr = path.split("/");
if (pathArr[0] === "scratch-addons-extension") {
  if (pathArr[1] === "settings") {
    let url = chrome.runtime.getURL(`webpages/settings/index.html${window.location.search}`);
    if (location.hash) url += location.hash;
    chrome.runtime.sendMessage({ replaceTabWithUrl: url });
  }
}
if (path === "discuss/3/topic/add/") {
  window.addEventListener("load", () => forumWarning("forumWarning"));
} else if (path.startsWith("discuss/topic/")) {
  window.addEventListener("load", () => {
    if (document.querySelector('div.linkst > ul > li > a[href="/discuss/18/"]')) {
      forumWarning("forumWarningGeneral");
    }
  });
}


function addStyle(addon) {
  const allStyles = [...document.querySelectorAll(".scratch-addons-style")];
  const addonStyles = allStyles.filter((el) => el.getAttribute("data-addon-id") === addon.addonId);

  const appendByIndex = (el, index) => {
    // Append a style element in the correct place preserving order
    const nextElement = allStyles.find((el) => Number(el.getAttribute("data-addon-index") > index));
    if (nextElement) document.documentElement.insertBefore(el, nextElement);
    else {
      if (document.body) document.documentElement.insertBefore(el, document.body);
      else document.documentElement.appendChild(el);
    }
  };

  if (addon.styles.length > MAX_USERSTYLES_PER_ADDON) {
    console.warn(
      "Please increase MAX_USERSTYLES_PER_ADDON in content-scripts/cs.js, otherwise style priority is not guaranteed! Has",
      addon.styles.length,
      "styles, current max is",
      MAX_USERSTYLES_PER_ADDON
    );
  }
  for (let i = 0; i < addon.styles.length; i++) {
    const userstyle = addon.styles[i];
    const styleIndex = addon.index * MAX_USERSTYLES_PER_ADDON + userstyle.index;
    if (addon.injectAsStyleElt) {
      // If an existing style is already appended, just enable it instead
      const existingEl = addonStyles.find((style) => style.dataset.styleHref === userstyle.href);
      if (existingEl) {
        existingEl.disabled = false;
        continue;
      }

      const style = document.createElement("style");
      style.classList.add("scratch-addons-style");
      style.setAttribute("data-addon-id", addon.addonId);
      style.setAttribute("data-addon-index", styleIndex);
      style.setAttribute("data-style-href", userstyle.href);
      style.textContent = userstyle.text;
      appendByIndex(style, styleIndex);
    } else {
      const existingEl = addonStyles.find((style) => style.href === userstyle.href);
      if (existingEl) {
        existingEl.disabled = false;
        continue;
      }

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.setAttribute("data-addon-id", addon.addonId);
      link.setAttribute("data-addon-index", styleIndex);
      link.classList.add("scratch-addons-style");
      link.href = userstyle.href;
      appendByIndex(link, styleIndex);
    }
  }
}
function removeAddonStyles(addonId) {
  // Instead of actually removing the style/link element, we just disable it.
  // That way, if the addon needs to be reenabled, it can just enable that style/link element instead of readding it.
  // This helps with load times for link elements.
  document.querySelectorAll(`[data-addon-id='${addonId}']`).forEach((style) => (style.disabled = true));
}
function removeAddonStylesPartial(addonId, stylesToRemove) {
  document.querySelectorAll(`[data-addon-id='${addonId}']`).forEach((style) => {
    if (stylesToRemove.includes(style.href || style.dataset.styleHref)) style.disabled = true;
  });
}

function injectUserstyles(addonsWithUserstyles) {
  for (const addon of addonsWithUserstyles || []) {
    addStyle(addon);
  }
}

function injectUserScripts(injectUserScripts) {
  for (const addon of injectUserScripts || []) {
    console.log("script!", addon)
      //if (addon.scripts.length) runAddonUserscripts(addon);
  }
}

const textColorLib = __scratchAddonsTextColor;
const existingCssVariables = [];
function setCssVariables(addonSettings, addonsWithUserstyles) {
  const hyphensToCamelCase = (s) => s.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  const setVar = (addonId, varName, value) => {
    const realVarName = `--${hyphensToCamelCase(addonId)}-${varName}`;
    document.documentElement.style.setProperty(realVarName, value);
    existingCssVariables.push(realVarName);
  };

  const removeVar = (addonId, varName) =>
    document.documentElement.style.removeProperty(`--${hyphensToCamelCase(addonId)}-${varName}`);

  // First remove all CSS variables, we add them all back anyway
  existingCssVariables.forEach((varName) => document.documentElement.style.removeProperty(varName));
  existingCssVariables.length = 0;

  const addonIds = addonsWithUserstyles.map((obj) => obj.addonId);

  // Set variables for settings
  for (const addonId of addonIds) {
    for (const settingName of Object.keys(addonSettings[addonId] || {})) {
      const value = addonSettings[addonId][settingName];
      if (typeof value === "string" || typeof value === "number") {
        setVar(addonId, hyphensToCamelCase(settingName), addonSettings[addonId][settingName]);
      }
    }
  }

  // Set variables for customCssVariables
  const getColor = (addonId, obj) => {
    if (typeof obj !== "object" || obj === null) return obj;
    let hex;
    switch (obj.type) {
      case "settingValue":
        return addonSettings[addonId][obj.settingId];
      case "ternary":
        // this is not even a color lol
        return getColor(addonId, obj.source) ? getColor(addonId, obj.true) : getColor(addonId, obj.false);
      case "map":
        return getColor(addonId, obj.options[getColor(addonId, obj.source)] ?? obj.default);
      case "textColor": {
        hex = getColor(addonId, obj.source);
        let black = getColor(addonId, obj.black);
        let white = getColor(addonId, obj.white);
        let threshold = getColor(addonId, obj.threshold);
        return textColorLib.textColor(hex, black, white, threshold);
      }
      case "alphaThreshold": {
        hex = getColor(addonId, obj.source);
        let { a } = textColorLib.parseHex(hex);
        let threshold = getColor(addonId, obj.threshold) || 0.5;
        if (a >= threshold) return getColor(addonId, obj.opaque);
        else return getColor(addonId, obj.transparent);
      }
      case "multiply": {
        hex = getColor(addonId, obj.source);
        return textColorLib.multiply(hex, obj);
      }
      case "brighten": {
        hex = getColor(addonId, obj.source);
        return textColorLib.brighten(hex, obj);
      }
      case "alphaBlend": {
        let opaqueHex = getColor(addonId, obj.opaqueSource);
        let transparentHex = getColor(addonId, obj.transparentSource);
        return textColorLib.alphaBlend(opaqueHex, transparentHex);
      }
      case "makeHsv": {
        let hSource = getColor(addonId, obj.h);
        let sSource = getColor(addonId, obj.s);
        let vSource = getColor(addonId, obj.v);
        return textColorLib.makeHsv(hSource, sSource, vSource);
      }
      case "recolorFilter": {
        hex = getColor(addonId, obj.source);
        return textColorLib.recolorFilter(hex);
      }
    }
  };

  for (const addon of addonsWithUserstyles) {
    const addonId = addon.addonId;
    for (const customVar of addon.cssVariables) {
      const varName = customVar.name;
      const varValue = getColor(addonId, customVar.value);
      if (varValue === null && customVar.dropNull) {
        removeVar(addonId, varName);
      } else {
        setVar(addonId, varName, varValue);
      }
    }
  }
}

function waitForDocumentHead() {
  if (document.head) return Promise.resolve();
  else {
    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        if (document.head) {
          resolve();
          observer.disconnect();
        }
      });
      observer.observe(document.documentElement, { subtree: true, childList: true });
    });
  }
}

function getL10NURLs() {
    console.log("LANGUAGE URLS CALLED!!!")
//  const langCode = /scratchlanguage=([\w-]+)/.exec(document.cookie)?.[1] || "en";
  const urls = [];
//  if (langCode === "pt") {
//    urls.push('./addons-l10n/pt-br'));
//  }
//  if (langCode.includes("-")) {
//    urls.push('./addons-l10n/${langCode.split("-")[0]}'));
//  }
  const enJSON = "../../addons-l10n/en";
//  if (!urls.includes(enJSON))
  urls.push(enJSON);
  return urls;
}

async function onInfoAvailable({ globalState: globalStateMsg, addonsWithUserscripts, addonsWithUserstyles }) {
  console.log("ONINFOAVAILABLE CALLED")
  const everLoadedUserscriptAddons = new Set(addonsWithUserscripts.map((entry) => entry.addonId));
  const disabledDynamicAddons = new Set();
  globalState = globalStateMsg;
  setCssVariables(globalState.addonSettings, addonsWithUserstyles);
  // Just in case, make sure the <head> loaded before injecting styles
      waitForDocumentHead().then(() => {
        injectUserstyles(addonsWithUserstyles);
        injectUserScripts(addonsWithUserscripts);
    });

//  chrome.runtime.onMessage.addListener((request) => {
//    if (request.dynamicAddonEnabled) {
//      const {
//        scripts,
//        userstyles,
//        cssVariables,
//        addonId,
//        injectAsStyleElt,
//        index,
//        dynamicEnable,
//        dynamicDisable,
//        partial,
//      } = request.dynamicAddonEnabled;
//      disabledDynamicAddons.delete(addonId);
//      addStyle({ styles: userstyles, addonId, injectAsStyleElt, index });
//      if (partial) {
//        // Partial: part of userstyle was (re-)enabled.
//        // No need to deal with userscripts here.
//        const addonsWithUserstylesEntry = addonsWithUserstyles.find((entry) => entry.addonId === addonId);
//        if (addonsWithUserstylesEntry) {
//          addonsWithUserstylesEntry.styles = userstyles;
//        } else {
//          addonsWithUserstyles.push({ styles: userstyles, cssVariables, addonId, injectAsStyleElt, index });
//        }
//      } else {
//        // Non-partial: the whole addon was (re-)enabled.
//        if (everLoadedUserscriptAddons.has(addonId)) {
//          if (!dynamicDisable) return;
//          // Addon was reenabled
//          _page_.fireEvent({ name: "reenabled", addonId, target: "self" });
//        } else {
//          if (!dynamicEnable) return;
//          // Addon was not injected in page yet
//
//          // If the the module wasn't loaded yet, don't run these scripts as they will run later anyway.
//          if (_page_) {
//            _page_.runAddonUserscripts({ addonId, scripts, enabledLate: true });
//            everLoadedUserscriptAddons.add(addonId);
//          }
//        }
//
//        addonsWithUserscripts.push({ addonId, scripts });
//        addonsWithUserstyles.push({ styles: userstyles, cssVariables, addonId, injectAsStyleElt, index });
//      }
//      setCssVariables(globalState.addonSettings, addonsWithUserstyles);
//    } else if (request.dynamicAddonDisable) {
//      // Note: partialDynamicDisabledStyles includes ones that are disabled currently, too!
//      const { addonId, partialDynamicDisabledStyles } = request.dynamicAddonDisable;
//      // This may run twice if the style-only addon was first "partially"
//      // (but in fact entirely) disabled, and it was then toggled off.
//      // Early return in this situation.
//      if (disabledDynamicAddons.has(addonId)) return;
//      const scriptIndex = addonsWithUserscripts.findIndex((a) => a.addonId === addonId);
//      const styleIndex = addonsWithUserstyles.findIndex((a) => a.addonId === addonId);
//      if (_page_) {
//        if (partialDynamicDisabledStyles) {
//          // Userstyles are partially disabled.
//          // This should not result in other parts being disabled,
//          // unless that means no scripts/styles are running on this page.
//          removeAddonStylesPartial(addonId, partialDynamicDisabledStyles);
//          if (styleIndex > -1) {
//            // This should exist... right? Safeguarding anyway
//            const userstylesEntry = addonsWithUserstyles[styleIndex];
//            userstylesEntry.styles = userstylesEntry.styles.filter(
//              (style) => !partialDynamicDisabledStyles.includes(style.href)
//            );
//            if (userstylesEntry.styles.length || scriptIndex > -1) {
//              // The addon was not completely disabled, so early return.
//              // Note: we do not need to recalculate cssVariables here
//              return;
//            }
//          }
//        } else {
//          removeAddonStyles(addonId);
//        }
//        disabledDynamicAddons.add(addonId);
//        _page_.fireEvent({ name: "disabled", addonId, target: "self" });
//      } else {
//        everLoadedUserscriptAddons.delete(addonId);
//      }
//      if (scriptIndex !== -1) addonsWithUserscripts.splice(scriptIndex, 1);
//      if (styleIndex !== -1) addonsWithUserstyles.splice(styleIndex, 1);
//
//      setCssVariables(globalState.addonSettings, addonsWithUserstyles);
//    } else if (request.updateUserstylesSettingsChange) {
//      const {
//        userstyles,
//        addonId,
//        injectAsStyleElt,
//        index,
//        dynamicEnable,
//        dynamicDisable,
//        addonSettings,
//        cssVariables,
//      } = request.updateUserstylesSettingsChange;
//      const addonIndex = addonsWithUserstyles.findIndex((addon) => addon.addonId === addonId);
//      removeAddonStyles(addonId);
//      if (addonIndex > -1 && userstyles.length === 0 && dynamicDisable) {
//        // This is actually dynamicDisable condition, but since this does not involve
//        // toggling addon state, this is not considered one by the code.
//        addonsWithUserstyles.splice(addonIndex, 1);
//        // This might race with newGlobalState, so we merge explicitly here
//        setCssVariables({ ...globalState.addonSettings, [addonId]: addonSettings }, addonsWithUserstyles);
//        console.log(`Dynamically disabling all userstyles of ${addonId} due to settings change`);
//        // Early return because we know addStyle will be no-op
//        return;
//        // Wait, but what about userscripts? Great question. No, we do not need to fire events
//        // or handle userscripts at all. This is because settings change does not cause
//        // userscripts to be enabled or disabled (only userstyles). Instead userscripts
//        // should always be executed but listen to settings change event. Thus this
//        // "dynamic disable" does not fire disable event, because userscripts aren't disabled.
//      }
//      if (addonIndex > -1 && (dynamicDisable || dynamicEnable)) {
//        // Userstyles enabled when there are already enabled ones, or
//        // userstyles partially disabled. do not call
//        // removeAddonStylesPartial as we remove and re-add instead.
//        const userstylesEntry = addonsWithUserstyles[addonIndex];
//        userstylesEntry.styles = userstyles;
//      }
//      if (addonIndex === -1 && userstyles.length > 0 && dynamicEnable) {
//        // This is actually dynamicEnable condition, but since this does not involve
//        // toggling addon state, this is not considered one by the code.
//        console.log(`Dynamically enabling userstyle addon ${addonId} due to settings change`);
//        addonsWithUserstyles.push({ styles: userstyles, cssVariables, addonId, injectAsStyleElt, index });
//        disabledDynamicAddons.delete(addonId);
//        setCssVariables({ ...globalState.addonSettings, [addonId]: addonSettings }, addonsWithUserstyles);
//        // Same goes here; enabling a setting does not run or re-enable an userscript by design.
//      }
//      // Removing the addon styles and readding them works since the background
//      // will send a different array for the new valid userstyles.
//      // Try looking for the "userscriptMatches" function.
//      addStyle({ styles: userstyles, addonId, injectAsStyleElt, index });
//    }
//  });
  if (!_page_) {
    await new Promise((resolve) => {
      // We're registering this load event after the load event that
      // sets _page_, so we can guarantee _page_ exists now
      moduleScript.addEventListener("load", resolve);
    });
  }

  _page_.globalState = globalState;
  console.log("Rigt above calling getL10NURLS");
  _page_.l10njson = getL10NURLs();
  _page_.addonsWithUserscripts = addonsWithUserscripts;
  _page_.dataReady = true;

//  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//    if (request.newGlobalState) {
//      _page_.globalState = request.newGlobalState;
//      globalState = request.newGlobalState;
//      setCssVariables(request.newGlobalState.addonSettings, addonsWithUserstyles);
//    } else if (request.fireEvent) {
//      _page_.fireEvent(request.fireEvent);
//    } else if (request === "getRunningAddons") {
//      const userscripts = addonsWithUserscripts.map((obj) => obj.addonId);
//      const userstyles = addonsWithUserstyles.map((obj) => obj.addonId);
//      sendResponse({
//        userscripts,
//        userstyles,
//        disabledDynamicAddons: Array.from(disabledDynamicAddons),
//      });
//    } else if (request === "refetchSession") {
//      _page_.refetchSession();
//    }
//  });
}

const escapeHTML = (str) => str.replace(/([<>'"&])/g, (_, l) => `&#${l.charCodeAt(0)};`);

if (location.pathname.startsWith("/discuss/")) {
  // We do this first as sb2 runs fast.
  const preserveBlocks = () => {
    document.querySelectorAll("pre.blocks").forEach((el) => {
      el.setAttribute("data-original", el.innerText);
    });
  };
  if (document.readyState !== "loading") {
    setTimeout(preserveBlocks, 0);
  } else {
    window.addEventListener("DOMContentLoaded", preserveBlocks, { once: true });
  }
}

function forumWarning(key) {
  let postArea = document.querySelector("form#post > label");
  if (postArea) {
    var errorList = document.querySelector("form#post > label > ul");
    if (!errorList) {
      let typeArea = postArea.querySelector("strong");
      errorList = document.createElement("ul");
      errorList.classList.add("errorlist");
      postArea.insertBefore(errorList, typeArea);
    }
    let addonError = document.createElement("li");
    let reportLink = document.createElement("a");
    const uiLanguage = chrome.i18n.getUILanguage();
    const localeSlash = uiLanguage.startsWith("en") ? "" : `${uiLanguage.split("-")[0]}/`;
    const utm = `utm_source=extension&utm_medium=forumwarning&utm_campaign=v${chrome.runtime.getManifest().version}`;
    reportLink.href = `https://scratchaddons.com/${localeSlash}feedback/?ext_version=${
      chrome.runtime.getManifest().version
    }&${utm}`;
    reportLink.target = "_blank";
    reportLink.innerText = chrome.i18n.getMessage("reportItHere");
    let text1 = document.createElement("span");
    text1.innerHTML = escapeHTML(chrome.i18n.getMessage(key, DOLLARS)).replace("$1", reportLink.outerHTML);
    addonError.appendChild(text1);
    errorList.appendChild(addonError);
  }
}

const showBanner = () => {
  const makeBr = () => document.createElement("br");

  const notifOuterBody = document.createElement("div");
  const notifInnerBody = Object.assign(document.createElement("div"), {
    id: "sa-notification",
    style: `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 700px;
    max-height: 270px;
    display: flex;
    align-items: center;
    padding: 10px;
    border-radius: 10px;
    background-color: #222;
    color: white;
    z-index: 99999;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    text-shadow: none;
    box-shadow: 0 0 20px 0px #0000009e;
    font-size: 14px;
    line-height: normal;`,
  });
  /*
  const notifImageLink = Object.assign(document.createElement("a"), {
    href: "https://www.youtube.com/watch?v=oRo0tMWEpiA",
    target: "_blank",
    rel: "noopener",
    referrerPolicy: "strict-origin-when-cross-origin",
  });
  // Thumbnails were 100px height
  */
  const notifImage = Object.assign(document.createElement("img"), {
    // alt: chrome.i18n.getMessage("hexColorPickerAlt"),
    src: chrome.runtime.getURL("/images/cs/icon.png"),
    style: "height: 150px; border-radius: 5px; padding: 20px",
  });
  const notifText = Object.assign(document.createElement("div"), {
    id: "sa-notification-text",
    style: "margin: 12px;",
  });
  const notifTitle = Object.assign(document.createElement("span"), {
    style: "font-size: 18px; line-height: normal; display: inline-block; margin-bottom: 12px;",
    textContent: chrome.i18n.getMessage("extensionUpdate"),
  });
  const notifClose = Object.assign(document.createElement("img"), {
    style: `
    float: right;
    cursor: pointer;
    width: 24px;`,
    title: chrome.i18n.getMessage("close"),
    src: chrome.runtime.getURL("../images/cs/close.svg"),
  });
  notifClose.addEventListener("click", () => notifInnerBody.remove(), { once: true });

  const NOTIF_TEXT_STYLE = "display: block; color: white !important;";
  const NOTIF_LINK_STYLE = "color: #1aa0d8; font-weight: normal; text-decoration: underline;";

  const notifInnerText0 = Object.assign(document.createElement("span"), {
    style: NOTIF_TEXT_STYLE + "font-weight: bold;",
    textContent: chrome.i18n
      .getMessage("extensionHasUpdated", DOLLARS)
      .replace(/\$(\d+)/g, (_, i) => [chrome.runtime.getManifest().version][Number(i) - 1]),
  });
  const notifInnerText1 = Object.assign(document.createElement("span"), {
    style: NOTIF_TEXT_STYLE,
    innerHTML: escapeHTML(chrome.i18n.getMessage("extensionUpdateInfo1_v1_35", DOLLARS)).replace(
      /\$(\d+)/g,
      (_, i) =>
        [
          /*
          Object.assign(document.createElement("b"), { textContent: chrome.i18n.getMessage("newFeature") }).outerHTML,
          Object.assign(document.createElement("b"), { textContent: chrome.i18n.getMessage("newFeatureName") })
            .outerHTML,
          */
          Object.assign(document.createElement("a"), {
            href: "https://scratch.mit.edu/scratch-addons-extension/settings?source=updatenotif",
            target: "_blank",
            style: NOTIF_LINK_STYLE,
            textContent: chrome.i18n.getMessage("scratchAddonsSettings"),
          }).outerHTML,
        ][Number(i) - 1]
    ),
  });
  const notifInnerText2 = Object.assign(document.createElement("span"), {
    style: NOTIF_TEXT_STYLE,
    textContent: chrome.i18n.getMessage("extensionUpdateInfo2_v1_35"),
  });
  const notifFooter = Object.assign(document.createElement("span"), {
    style: NOTIF_TEXT_STYLE,
  });
  const uiLanguage = chrome.i18n.getUILanguage();
  const localeSlash = uiLanguage.startsWith("en") ? "" : `${uiLanguage.split("-")[0]}/`;
  const utm = `utm_source=extension&utm_medium=updatenotification&utm_campaign=v${
    chrome.runtime.getManifest().version
  }`;
  const notifFooterChangelog = Object.assign(document.createElement("a"), {
    href: `https://scratchaddons.com/${localeSlash}changelog?${utm}`,
    target: "_blank",
    style: NOTIF_LINK_STYLE,
    textContent: chrome.i18n.getMessage("notifChangelog"),
  });
  const notifFooterFeedback = Object.assign(document.createElement("a"), {
    href: `https://scratchaddons.com/${localeSlash}feedback/?ext_version=${
      chrome.runtime.getManifest().version
    }&${utm}`,
    target: "_blank",
    style: NOTIF_LINK_STYLE,
    textContent: chrome.i18n.getMessage("feedback"),
  });
  const notifFooterTranslate = Object.assign(document.createElement("a"), {
    href: "https://scratchaddons.com/translate",
    target: "_blank",
    style: NOTIF_LINK_STYLE,
    textContent: chrome.i18n.getMessage("translate"),
  });
  const notifFooterLegal = Object.assign(document.createElement("span"), {
    style: NOTIF_TEXT_STYLE + "font-size: 12px;",
    textContent: chrome.i18n.getMessage("notAffiliated"),
  });
  notifFooter.appendChild(notifFooterChangelog);
  notifFooter.appendChild(document.createTextNode(" | "));
  notifFooter.appendChild(notifFooterFeedback);
  notifFooter.appendChild(document.createTextNode(" | "));
  notifFooter.appendChild(notifFooterTranslate);
  notifFooter.appendChild(makeBr());
  notifFooter.appendChild(notifFooterLegal);

  notifText.appendChild(notifTitle);
  notifText.appendChild(notifClose);
  notifText.appendChild(makeBr());
  notifText.appendChild(notifInnerText0);
  notifText.appendChild(makeBr());
  notifText.appendChild(notifInnerText1);
  notifText.appendChild(makeBr());
  notifText.appendChild(notifInnerText2);
  notifText.appendChild(makeBr());
  notifText.appendChild(notifFooter);

  // notifImageLink.appendChild(notifImage);

  notifInnerBody.appendChild(notifImage);
  notifInnerBody.appendChild(notifText);

  notifOuterBody.appendChild(notifInnerBody);

  document.body.appendChild(notifOuterBody);
};

const handleBanner = async () => {
  if (window.frameElement) return;
  const currentVersion = "1.35.1"
  const [major, minor, _] = currentVersion.split(".");
  const currentVersionMajorMinor = `${major}.${minor}`;
  // Making this configurable in the future?
  // Using local because browser extensions may not be updated at the same time across browsers
  const settings = {
      "bannerSettings": {
          "lastShown": "1.35.1"
      }
  }
  const force = !settings || !settings.bannerSettings;
};

if (document.readyState !== "loading") {
  handleBanner();
} else {
  window.addEventListener("DOMContentLoaded", handleBanner, { once: true });
}

const isProfile = pathArr[0] === "users" && pathArr[2] === "";
const isStudio = pathArr[0] === "studios";
const isProject = pathArr[0] === "projects";
const isForums = pathArr[0] === "discuss";

if (isProfile || isStudio || isProject || isForums) {
  const removeReiteratedChars = (string) =>
    string
      .split("")
      .filter((char, i, charArr) => (i === 0 ? true : charArr[i - 1] !== char))
      .join("");

  const shouldCaptureComment = (value) => {
    const trimmedValue = value.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ""); // Trim like scratchr2
    const limitedValue = removeReiteratedChars(trimmedValue.toLowerCase().replace(/[^a-z]+/g, ""));
    const regex = /scratchadons/;
    return regex.test(limitedValue);
  };
  const extensionPolicyLink = document.createElement("a");
  extensionPolicyLink.href = "https://scratch.mit.edu/discuss/topic/284272/";
  extensionPolicyLink.target = "_blank";
  extensionPolicyLink.innerText = "captureCommentPolicy"
  Object.assign(extensionPolicyLink.style, {
    textDecoration: "underline",
    color: isForums ? "" : "white",
  });
  const errorMsgHtml = ""
  const sendAnywayMsg = "captureCommentPostAnyway";
  const confirmMsg = "captureCommentConfirm";

  if (isProfile) {
    window.addEventListener(
      "click",
      (e) => {
        if (e.target.tagName !== "A" || !e.target.parentElement.matches("div.button[data-commentee-id]")) return;
        const form = e.target.closest("form");
        if (!form) return;
        if (form.hasAttribute("data-sa-send-anyway")) {
          form.removeAttribute("data-sa-send-anyway");
          return;
        }
        const textarea = form.querySelector("textarea[name=content]");
        if (!textarea) return;
        if (shouldCaptureComment(textarea.value)) {
          e.stopPropagation();
          e.preventDefault(); // Avoid location.hash being set to null

          form.querySelector("[data-control=error] .text").innerHTML = errorMsgHtml + " ";
          const sendAnyway = document.createElement("a");
          sendAnyway.onclick = () => {
            const res = confirm(confirmMsg);
            if (res) {
              form.setAttribute("data-sa-send-anyway", "");
              form.querySelector("[data-control=post]").click();
            }
          };
          sendAnyway.textContent = sendAnywayMsg;
          Object.assign(sendAnyway.style, {
            textDecoration: "underline",
            color: "white",
          });
          form.querySelector("[data-control=error] .text").appendChild(sendAnyway);
          form.querySelector(".control-group").classList.add("error");
        }
      },
      { capture: true }
    );
  } else if (isProject || isStudio) {
    window.addEventListener(
      "click",
      (e) => {
        if (!(e.target.tagName === "SPAN" || e.target.tagName === "BUTTON")) return;
        if (!e.target.closest("button.compose-post")) return;
        const form = e.target.closest("form.full-width-form");
        if (!form) return;
        // Remove error when about to send comment anyway, if it exists
        form.parentNode.querySelector(".sa-compose-error-row")?.remove();
        if (form.hasAttribute("data-sa-send-anyway")) {
          form.removeAttribute("data-sa-send-anyway");
          return;
        }
        const textarea = form.querySelector("textarea[name=compose-comment]");
        if (!textarea) return;
        if (shouldCaptureComment(textarea.value)) {
          e.stopPropagation();
          const errorRow = document.createElement("div");
          errorRow.className = "flex-row compose-error-row sa-compose-error-row";
          const errorTip = document.createElement("div");
          errorTip.className = "compose-error-tip";
          const span = document.createElement("span");
          span.innerHTML = errorMsgHtml + " ";
          const sendAnyway = document.createElement("a");
          sendAnyway.onclick = () => {
            const res = confirm(confirmMsg);
            if (res) {
              form.setAttribute("data-sa-send-anyway", "");
              form.querySelector(".compose-post")?.click();
            }
          };
          sendAnyway.textContent = sendAnywayMsg;
          errorTip.appendChild(span);
          errorTip.appendChild(sendAnyway);
          errorRow.appendChild(errorTip);
          form.parentNode.prepend(errorRow);

          // Hide error after typing like scratch-www does
          textarea.addEventListener(
            "input",
            () => {
              errorRow.remove();
            },
            { once: true }
          );
          // Hide error after clicking cancel like scratch-www does
          form.querySelector(".compose-cancel").addEventListener(
            "click",
            () => {
              errorRow.remove();
            },
            { once: true }
          );
        }
      },
      { capture: true }
    );
  } else if (isForums) {
    window.addEventListener("click", (e) => {
      const potentialPostButton = e.target.closest("button[type=submit]");
      if (!potentialPostButton) return;
      const form = e.target.closest("form");
      if (!form) return;
      if (form.hasAttribute("data-sa-send-anyway")) {
        form.removeAttribute("data-sa-send-anyway");
        return;
      }
      const existingWarning = form.parentElement.querySelector(".sa-extension-policy-warning");
      if (existingWarning) {
        // Do nothing. The warning automatically disappears after typing into the form.
        e.preventDefault();
        existingWarning.scrollIntoView({ behavior: "smooth" });
        return;
      }
      const textarea = form.querySelector("textarea.markItUpEditor");
      if (!textarea) return;
      if (shouldCaptureComment(textarea.value)) {
        const errorTip = document.createElement("li");
        errorTip.classList.add("errorlist", "sa-extension-policy-warning");
        errorTip.style.scrollMarginTop = "50px";
        errorTip.style.fontWeight = "bold";
        errorTip.innerHTML = errorMsgHtml + " ";
        const sendAnyway = document.createElement("a");
        sendAnyway.onclick = () => {
          const res = confirm(confirmMsg);
          if (res) {
            form.setAttribute("data-sa-send-anyway", "");
            form.querySelector("button[type=submit]")?.click();
          }
        };
        sendAnyway.textContent = sendAnywayMsg;
        errorTip.appendChild(sendAnyway);

        const postArea = form.querySelector("label");
        if (!postArea) return;
        let errorList = form.querySelector("label > ul");
        if (!errorList) {
          const typeArea = postArea.querySelector("strong");
          errorList = document.createElement("ul");
          errorList.classList.add("errorlist");
          postArea.insertBefore(errorList, typeArea);
        }

        errorList.appendChild(errorTip);
        errorTip.scrollIntoView({ behavior: "smooth" });
        e.preventDefault();

        // Hide error after typing
        textarea.addEventListener(
          "input",
          () => {
            errorTip.remove();
            if (errorList.querySelector("li") === null) {
              errorList.remove();
            }
          },
          { once: true }
        );
      }
    });
  }
}
console.log("Right above onInfoAvailable");
onInfoAvailable({
    "url": "https://scratchfoundation.github.io/scratch-gui/develop/",
    "httpStatusCode": null,
    "globalState": {
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
    },
    "addonsWithUserscripts": [
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
            "addonId": "editor-colored-context-menus",
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
        }
    ],
    "addonsWithUserstyles": [
        {
            "addonId": "editor-searchable-dropdowns",
            "styles": [
                {
                    "href": "../../addons/editor-searchable-dropdowns/userscript.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 0
        },
        {
            "addonId": "discuss-button",
            "styles": [
                {
                    "href": "../../addons/discuss-button/compact-nav.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 5
        },
        {
            "addonId": "progress-bar",
            "styles": [
                {
                    "href": "../../addons/progress-bar/userstyle.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 12
        },
        {
            "addonId": "remix-tree-button",
            "styles": [
                {
                    "href": "../../addons/remix-tree-button/button.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 13
        },
        {
            "addonId": "mouse-pos",
            "styles": [
                {
                    "href": "../../addons/mouse-pos/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 26
        },
        {
            "addonId": "clones",
            "styles": [
                {
                    "href": "../../addons/clones/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 27
        },
        {
            "addonId": "editor-messages",
            "styles": [
                {
                    "href": "../../addons/editor-messages/userstyle.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 30
        },
        {
            "addonId": "pause",
            "styles": [
                {
                    "href": "../../addons/pause/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 31
        },
        {
            "addonId": "animated-thumb",
            "styles": [
                {
                    "href": "../../addons/animated-thumb/userscript.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 33
        },
        {
            "addonId": "color-picker",
            "styles": [
                {
                    "href": "../../addons/color-picker/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 44
        },
        {
            "addonId": "onion-skinning",
            "styles": [
                {
                    "href": "../../addons/onion-skinning/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 45
        },
        {
            "addonId": "hide-flyout",
            "styles": [
                {
                    "href": "../../addons/hide-flyout/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [
                {
                    "name": "lockDisplay",
                    "value": {
                        "type": "map",
                        "source": {
                            "type": "settingValue",
                            "settingId": "toggle"
                        },
                        "options": {
                            "hover": "flex",
                            "cathover": "flex",
                            "category": "none"
                        }
                    }
                },
                {
                    "name": "placeholderDisplay",
                    "value": {
                        "type": "map",
                        "source": {
                            "type": "settingValue",
                            "settingId": "toggle"
                        },
                        "options": {
                            "hover": "block",
                            "cathover": "none",
                            "category": "none"
                        }
                    }
                }
            ],
            "index": 50
        },
        {
            "addonId": "comments-linebreaks",
            "styles": [
                {
                    "href": "../../addons/comments-linebreaks/break-spaces.css",
                    "index": 0
                },
                {
                    "href": "../../addons/comments-linebreaks/scrollbars.css",
                    "index": 1
                }
            ],
            "cssVariables": [],
            "index": 51
        },
        {
            "addonId": "account-settings-capitalize",
            "styles": [
                {
                    "href": "../../addons/account-settings-capitalize/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 52
        },
        {
            "addonId": "copy-message-link",
            "styles": [
                {
                    "href": "../../addons/copy-message-link/project.css",
                    "index": 1
                }
            ],
            "cssVariables": [],
            "index": 55
        },
        {
            "addonId": "variable-manager",
            "styles": [
                {
                    "href": "../../addons/variable-manager/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 57
        },
        {
            "addonId": "custom-zoom",
            "styles": [
                {
                    "href": "../../addons/custom-zoom/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 67
        },
        {
            "addonId": "remove-curved-stage-border",
            "styles": [
                {
                    "href": "../../addons/remove-curved-stage-border/remove-borders.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 72
        },
        {
            "addonId": "better-img-uploads",
            "styles": [
                {
                    "href": "../../addons/better-img-uploads/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 74
        },
        {
            "addonId": "debugger",
            "styles": [
                {
                    "href": "../../addons/debugger/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 78
        },
        {
            "addonId": "turbowarp-player",
            "styles": [
                {
                    "href": "../../addons/turbowarp-player/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 84
        },
        {
            "addonId": "hide-delete-button",
            "styles": [
                {
                    "href": "../../addons/hide-delete-button/sprites.css",
                    "index": 0
                },
                {
                    "href": "../../addons/hide-delete-button/costumes.css",
                    "index": 1
                },
                {
                    "href": "../../addons/hide-delete-button/sounds.css",
                    "index": 2
                }
            ],
            "cssVariables": [],
            "index": 88
        },
        {
            "addonId": "editor-unshare-button",
            "styles": [
                {
                    "href": "../../addons/editor-unshare-button/button.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 92
        },
        {
            "addonId": "emoji-picker",
            "styles": [
                {
                    "href": "../../addons/emoji-picker/userstyle.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 106
        },
        {
            "addonId": "editor-comment-previews",
            "styles": [
                {
                    "href": "../../addons/editor-comment-previews/userstyle.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 107
        },
        {
            "addonId": "swap-local-global",
            "styles": [
                {
                    "href": "../../addons/swap-local-global/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 108
        },
        {
            "addonId": "fix-editor-comments",
            "styles": [
                {
                    "href": "../../addons/fix-editor-comments/standalone-edit.css",
                    "index": 0
                },
                {
                    "href": "../../addons/fix-editor-comments/scroll.css",
                    "index": 1
                }
            ],
            "cssVariables": [],
            "index": 109
        },
        {
            "addonId": "tutorials-button",
            "styles": [
                {
                    "href": "../../addons/tutorials-button/userstyle.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 110
        },
        {
            "addonId": "disable-sprite-wobble",
            "styles": [
                {
                    "href": "../../addons/disable-sprite-wobble/userstyle.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 118
        },
        {
            "addonId": "sounds-duration",
            "styles": [
                {
                    "href": "../../addons/sounds-duration/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 120
        },
        {
            "addonId": "opacity-slider",
            "styles": [
                {
                    "href": "../../addons/opacity-slider/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 123
        },
        {
            "addonId": "zebra-striping",
            "styles": [
                {
                    "href": "../../addons/zebra-striping/userstyle.css",
                    "index": 0
                }
            ],
            "cssVariables": [
                {
                    "name": "shadeNumber",
                    "value": {
                        "type": "map",
                        "source": {
                            "type": "settingValue",
                            "settingId": "shade"
                        },
                        "options": {
                            "lighter": "1",
                            "darker": "-1"
                        }
                    }
                }
            ],
            "index": 125
        },
        {
            "addonId": "find-bar",
            "styles": [
                {
                    "href": "../../addons/find-bar/userstyle.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 126
        },
        {
            "addonId": "paint-snap",
            "styles": [
                {
                    "href": "../../addons/paint-snap/userstyle.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 129
        },
        {
            "addonId": "pick-colors-from-stage",
            "styles": [
                {
                    "href": "../../addons/pick-colors-from-stage/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 131
        },
        {
            "addonId": "middle-click-popup",
            "styles": [
                {
                    "href": "../../addons/middle-click-popup/userstyle.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 134
        },
        {
            "addonId": "copy-reporter",
            "styles": [
                {
                    "href": "../../addons/copy-reporter/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 138
        },
        {
            "addonId": "op-badge",
            "styles": [
                {
                    "href": "../../addons/op-badge/projectpage.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 142
        },
        {
            "addonId": "preview-project-description",
            "styles": [
                {
                    "href": "../../addons/preview-project-description/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 149
        },
        {
            "addonId": "hide-stage",
            "styles": [
                {
                    "href": "../../addons/hide-stage/style.css",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "index": 163
        },
        {
            "addonId": "resizable-comment-input",
            "styles": [
                {
                    "href": "../../addons/resizable-comment-input/userstyle.css",
                    "text": ".compose-comment .textarea-row textarea,\n#comments #comment-form textarea,\n#comments .comment form textarea {\n  resize: vertical;\n  min-height: 32px;\n  max-height: 480px;\n}\n\n/*# sourceURL=userstyle.css */",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "injectAsStyleElt": true,
            "index": 32
        },
        {
            "addonId": "dark-www",
            "styles": [
                {
                    "href": "../../addons/dark-www/experimental_scratchwww.css",
                    "text": "/* Page background */\nhtml,\nbody {\n  background-color: var(--darkWww-page);\n  color-scheme: var(--darkWww-page-colorScheme);\n}\n.sa-body-editor {\n  /* If website dark mode is enabled and editor dark mode\n  is disabled, inputs and scrollbars in the editor should\n  have a light background. */\n  color-scheme: light;\n}\n#view,\n.crash-container,\n.semicolon {\n  background-color: var(--darkWww-page);\n  color: var(--darkWww-page-text);\n}\n.subactions .share-date,\n.conf2019-description {\n  color: var(--darkWww-page-text);\n}\n.tips-getting-started,\n.tips-activity-guides {\n  background-color: var(--darkWww-page-ideas);\n  color: var(--darkWww-page-text);\n}\n.project-loves::before,\n.project-favorites::before,\n.project-remixes::before,\n.project-views::before,\n.sa-project-info img {\n  filter: var(--darkWww-page-filter);\n}\n.project-loves::before {\n  background-image: url(\"../../addons/dark-www/assets/love_transparent.svg\");\n}\n.project-favorites::before {\n  background-image: url(\"../../addons/dark-www/assets/favorite_transparent.svg\");\n}\n.project-loves.loved::before,\n.project-favorites.favorited::before {\n  filter: none;\n}\n\n/* Navigation bar background */\n#navigation,\n.dropdown,\n.dropdown.with-arrow::before,\n.user-projects-modal .user-projects-modal-title,\n.transfer-host-modal .transfer-host-title {\n  background-color: var(--darkWww-navbar);\n  color: var(--darkWww-navbar-text);\n}\n#navigation .link > a,\n#navigation .logo-a-title,\n#navigation .inner > ul > li.search .input[type=\"text\"],\n#navigation .account-nav .user-info,\n.login,\n.dropdown a:link,\n.dropdown a:visited,\n.dropdown a:active,\n.overflow-menu-container .overflow-menu-dropdown li button {\n  color: var(--darkWww-navbar-text);\n}\n#navigation .inner > ul > li.search .input[type=\"text\"]::placeholder {\n  color: var(--darkWww-navbar-transparentText);\n}\n#navigation .inner > ul > li.search .btn-search,\n#navigation .mystuff > a,\n.account-nav .user-info::after,\n.overflow-menu-container .overflow-menu-dropdown li button > img {\n  filter: var(--darkWww-navbar-filter);\n}\n#navigation .messages > a {\n  background-image: none;\n}\n#navigation .messages > a::before {\n  /* move background image into a pseudo-element\n     so that the filter doesn't affect the message count */\n  content: \"\";\n  display: block;\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  background: url(https://scratch.mit.edu/images/nav-notifications.png) no-repeat center / 45%;\n  filter: var(--darkWww-navbar-filter);\n}\n#navigation .messages > a:hover::before {\n  background-size: 50%;\n}\n#navigation .link > a:hover,\n#navigation .inner > ul > li.search .input,\n#navigation .inner > ul > li.right a:hover,\n.account-nav .user-info.open {\n  background-color: var(--darkWww-navbar-border);\n}\n.dropdown > li.divider,\n#navigation .logo-a-image {\n  border-color: var(--darkWww-navbar-border);\n}\n#navigation .inner > ul > li.search .input[type=\"text\"]:focus {\n  background-color: var(--darkWww-navbar-inputFocus);\n}\n\n/* Content background */\n.box,\n.box .box-content,\n.tab-background,\n.outer .tab-background,\n.tabs,\n.tabs button:hover,\n.os-chooser,\n.studio-tab-nav li,\n.user-projects-modal .user-projects-modal-nav button,\nbody:not(.sa-body-editor) .modal-content,\n.unsupported-browser .body,\nbody:not(.sa-body-editor) .formik-input,\n.studio-info .studio-image,\n.studio-report-modal .studio-report-tile-image,\n.grid .thumbnail,\n.studio-project-tile,\n.studio-member-tile,\n.studio-activity .studio-messages-list,\n.ttt-tile,\n.about .body,\n.messages-social-list,\n.comment-text,\n.comment .comment-body .comment-bubble,\n.comment .comment-body .comment-bubble::before,\n.invitation-card,\n.milestones-section .milestone-box,\n.supporters-section .comment-text,\n.timeline-card,\n.green.pull-quote,\n.card,\n.extension-landing .project-card,\n.extension-landing .hardware-card,\n.promote-modal .cancel-button,\nbody:not(.sa-body-editor) [class*=\"stage-header_stage-size-row_\"] > *,\nbody:not(.sa-body-editor) [class*=\"stage-header_stage-button_\"],\n.studio-adder-section .studio-adder-row input,\n.studio-adder-section .studio-adder-row .studio-adder-vertical-divider,\n.avatar-item img,\n.join-flow-outer-content /* username change */,\n.conf2019-panel-flag,\n.plan .faq .short,\n.conf2017-panel-flag,\nbody:not(.sa-body-editor) .join-flow-input,\nbody:not(.sa-body-editor) .select .join-flow-select,\nbody:not(.sa-body-editor) input[type=\"radio\"].formik-radio-button,\nbody:not(.sa-body-editor) input.formik-radio-input,\n.extension-landing .screenshot,\n.wedo .project-card,\n.transfer-host-modal .cancel-button,\n.transfer-host-modal .transfer-password-input,\n.comments-container .sa-emoji-picker,\n.studio-compose-container .sa-emoji-picker {\n  background-color: var(--darkWww-box);\n  color: var(--darkWww-box-text);\n  color-scheme: var(--darkWww-box-colorScheme);\n}\nbody:not(.sa-body-editor) .button.white,\n.intro-banner .intro-button,\n.donate-banner .donate-container .donate-button,\n.hoc-banner .hoc-more-activities,\n.hoc-banner .hoc-banner-image,\n.feature-banner .feature-learn-more,\n.feature-banner .feature-banner-image,\n.outer .categories li,\n.banner-wrapper .banner-button /* Choose a tutorial */,\n.studio-selector-button,\n.onboarding button.go-back,\n.button.mod-2019-conf-maillist-button,\n.index .title-banner p a button,\n.financials-section .financials-button,\n.donate-section .donate-button,\n.initiatives-section .initiatives-subsection-content .bubble.inverted {\n  background-color: var(--darkWww-box);\n}\n.expect .keynote .card {\n  background-color: transparent;\n}\n.studio-selector-button-selected {\n  background-color: #23be92;\n}\n.comment-text::after,\n.initiatives-section .initiatives-adaptation .community-quotes .community-quote .comment-text::after,\n.sa-annual-report-2020\n  .initiatives-section\n  .initiatives-community\n  .community-quotes\n  .community-quote\n  .comment-text::after,\n.wedo .project-card img {\n  border-color: var(--darkWww-box);\n}\n.news li p,\n.thumbnail .thumbnail-loves,\n.thumbnail .thumbnail-favorites,\n.thumbnail .thumbnail-remixes,\n.thumbnail .thumbnail-views,\n.tabs button,\n.tabs button:hover,\n.tabs button.active:hover,\n.grid .thumbnail .thumbnail-info .thumbnail-title .thumbnail-creator a,\n.unsupported-browser .faq-link-text,\na.social-messages-profile-link:visited,\na.social-messages-profile-link:link,\n.studio-selector-button-text-unselected,\n.studio-project-tile .studio-project-username,\n.studio-member-tile .studio-member-role,\nbody:not(.sa-body-editor) .join-flow-title {\n  color: var(--darkWww-box-text);\n}\n.activity-li .social-message-date,\n.comment .comment-body .comment-bottom-row .comment-time,\n.registration-step .help-text {\n  color: var(--darkWww-box-transparentText);\n}\nbody:not(.sa-body-editor) .formik-input::placeholder,\nbody:not(.sa-body-editor) .join-flow-privacy-message,\n.char-count {\n  color: var(--darkWww-box-inputPlaceholder);\n}\n.comment .comment-body .comment-bubble.comment-bubble-reported,\n.comment .comment-body .comment-bubble.comment-bubble-reported::before,\n.react-tel-input {\n  color: #575e75;\n}\n.thumbnail .thumbnail-loves::before,\n.thumbnail .thumbnail-favorites::before,\n.thumbnail .thumbnail-remixes::before,\n.thumbnail .thumbnail-views::before,\n.ttt-item img,\n.tabs button:not(.active) .tab-icon,\nbody:not(.sa-body-editor) [class*=\"stage-header_stage-button-icon_\"],\n.overflow-menu-container .overflow-menu-trigger img,\n.sa-footer-arrow {\n  filter: var(--darkWww-box-filter);\n}\n.studio-tab-nav li img {\n  filter: var(--darkWww-box-filterInverted);\n}\n.box,\n.box .box-header {\n  border-color: var(--darkWww-box-border);\n}\n.os-chooser .button {\n  background-color: var(--darkWww-box-tab);\n}\n.sub-nav button:active {\n  background-color: var(--darkWww-box-tabHover);\n}\n.tabs button:hover {\n  border-color: var(--darkWww-box-tabHover);\n}\n.tabs button.active,\n.tabs button.active:hover {\n  border-color: var(--darkWww-box-greenText);\n}\n.donate-banner .donate-container .donate-button,\n.banner-wrapper .banner-button /* Choose a tutorial */,\n.donate-section .donate-button {\n  color: var(--darkWww-box-greenText);\n}\n.social-message-icon {\n  opacity: var(--darkWww-box-messageIconOpacity);\n}\n.studio-report-modal .studio-report-tile:not(.studio-report-selected),\n.studio-report-modal .studio-report-tile-header:not(.studio-report-header-selected) {\n  background-color: var(--darkWww-box-studioReportTile);\n}\n.action-button.disabled,\n.studio-report-modal .button:disabled,\n.transfer-host-modal .button:disabled {\n  background-color: var(--darkWww-box-buttonDisabled);\n  color: white;\n}\nbody:not(.sa-body-editor) .select .join-flow-select {\n  background-image: var(--darkWww-box-caret);\n}\n.alert-wrapper .alert.alert-success,\n.studio-info-box.studio-info-box-success {\n  background-color: var(--darkWww-box-success);\n  color: var(--darkWww-box-text);\n}\n.alert-wrapper .alert.alert-error,\n.studio-info-box.studio-info-box-error {\n  background-color: var(--darkWww-box-error);\n  color: var(--darkWww-box-text);\n}\n\n/* Gray background */\n.box .box-header,\n.outer #projectBox,\n.download .installation,\nbody:not(.sa-body-editor) .gender-radio-row,\n.wedo .banner {\n  background-color: var(--darkWww-gray);\n  color: var(--darkWww-gray-text);\n}\nbody:not(.sa-body-editor) /* specificity */ .outer .sort-mode .select select {\n  background-color: transparent;\n  background-image: var(--darkWww-gray-caret);\n  color: var(--darkWww-gray-text);\n}\nbody:not(.sa-body-editor) .outer .sort-mode .select select:hover,\nbody:not(.sa-body-editor) .outer .sort-mode .select select:focus {\n  background-image: var(--darkWww-gray-caretHover);\n}\n.box .box-header {\n  border-top-color: var(--darkWww-gray-boxHighlight);\n}\n.toggle-switch .slider {\n  background-color: var(--darkWww-gray-darker);\n}\n.compose-comment .compose-bottom-row .compose-cancel,\n.modal-mute .feedback-nav .close-button {\n  background-color: var(--darkWww-gray-darker);\n  color: white;\n}\n\n/* Blue background */\n.empty,\n.intro-banner .intro-subnav,\n.social-message.mod-unread,\n.preview .remix-credit,\n.preview .project-description,\n.preview .project-lower-container,\n.studio-list-outer-scrollbox,\n.social-form,\n.studio-page,\n.user-projects-modal .user-projects-modal-content,\n.congratulations-page .congratulations-image-layout,\n.credits #acknowledgements,\n.download .blue,\np.callout,\n.mission-section,\n.milestones-section,\n.initiatives-section .initiatives-tools .subsection-tag.collaborator,\n.sa-annual-report-2019 .supporters-section,\n.sa-annual-report-2019 .leadership-section,\n.extension-landing .blue,\n.extension-landing .tip-box,\n.extension-landing .hardware-card-image,\n.transfer-host-modal .transfer-selection-heading,\n.transfer-host-modal .transfer-selection-scroll-pane,\n.transfer-host-modal .transfer-outcome,\n.filter-container,\n.tab-choice-selected-sa,\n#bad-username-splash .admin-message /* username change */,\n.sa-annual-report-2020 .initiatives-section .year-in-review,\n.initiatives-section .initiatives-subsection-content .map,\n.sa-annual-report-2021 .leadership-section .leadership-scratch-team .avatar-item img,\nbody:not(.sa-body-editor) .gender-radio-row:hover,\n.educators .feature {\n  background-color: var(--darkWww-blue);\n  color: var(--darkWww-blue-text);\n  color-scheme: var(--darkWww-blue-colorScheme);\n}\n.empty h4,\n.thumbnail-column .thumbnail .thumbnail-info .thumbnail-title .thumbnail-creator a,\n.studio-page #view,\n#bad-username-splash .admin-message .admin-message-date /* username change */,\n.milestones-section h2 {\n  color: var(--darkWww-blue-text);\n}\n.comment .comment-top-row .comment-delete::before,\n.comment .comment-top-row .comment-report::before,\n.studio-info .studio-info-footer-stats div img {\n  filter: var(--darkWww-blue-filter);\n}\n.studio-tab-nav a.nav_link:hover > li,\n.studio-info-box .studio-info-close-button {\n  background-color: var(--darkWww-blue-tab);\n}\n.studio-list-inner-scrollbox::-webkit-scrollbar-thumb {\n  background-color: var(--darkWww-blue-tabHover);\n}\n.studio-info textarea.studio-title:not(:focus),\n.studio-info textarea.studio-description:not(:focus),\n.extension-landing .blue hr {\n  border-color: var(--darkWww-blue-studioTextareaBorder);\n}\n.install-scratch .downloads-container .horizontal-divider::before,\n.install-scratch .downloads-container .horizontal-divider::after,\n.extension-landing .install-scratch-link .horizontal-divider::before,\n.extension-landing .install-scratch-link .horizontal-divider::after {\n  background-color: var(--darkWww-blue-studioTextareaBorder);\n}\n.commenting-status,\n.preview .comments-container .comments-turned-off,\n.studio-info .studio-description.uneditable,\n.studio-info-box {\n  background-color: var(--darkWww-blue-20);\n  color-scheme: var(--darKWww-blue-colorScheme);\n}\n.join-flow-footer-message {\n  background-color: var(--darkWww-blue-25);\n}\n.extension-chip,\nbody:not(.sa-body-editor) .gender-radio-row-selected,\nbody:not(.sa-body-editor) .gender-radio-row-selected:hover {\n  background-color: var(--darkWww-blue-25);\n  color: var(--darkWww-blue-text);\n}\n.replies.collapsed > .comment:last-of-type::after,\n.studio-list-bottom-gradient {\n  background-image: linear-gradient(var(--darkWww-blue-opacity0), var(--darkWww-blue));\n}\n\n/* Input background */\nbody:not(.sa-body-editor) .select select,\nbody:not(.sa-body-editor) .select select:hover,\nbody:not(.sa-body-editor) .select select:focus,\nbody:not(.sa-body-editor) .select select > option,\n.inplace-input,\n.inplace-textarea,\n.textarea,\n.input {\n  background-color: var(--darkWww-input);\n  color: var(--darkWww-input-text);\n}\n.inplace-input::placeholder,\n.inplace-textarea::placeholder {\n  color: var(--darkWww-input-transparentText);\n}\nbody:not(.sa-body-editor) .select select {\n  background-image: var(--darkWww-input-caret);\n}\nbody:not(.sa-body-editor) .select select:hover,\nbody:not(.sa-body-editor) .select select:focus {\n  background-image: var(--darkWww-input-caretHover);\n}\n\n/* Highlight color */\n.button,\n.outer .categories li.active,\n.subactions .action-buttons .action-button,\n.unsupported-browser .back-button,\n.studio-status-icon-unselected,\n.studio-info .studio-info-footer-report button,\n.studio-tab-nav .active > li,\n.user-projects-modal .user-projects-modal-nav button.active,\n.os-chooser .button.active,\n.step .step-number-row .step-number,\n.row .col-sm-9 input[type=\"radio\"]:checked {\n  background-color: var(--darkWww-button);\n  color: var(--darkWww-button-text);\n}\n.forms-close-button {\n  background-color: rgba(0, 0, 0, 0.1);\n}\n.banner-outer:not(.banner-danger) .banner-button /* Share */ {\n  background-color: #ffab1a;\n}\na.ttt-try-tutorial-button > span {\n  color: var(--darkWww-button-text);\n}\n.row .col-sm-9 input[type=\"radio\"]:checked::after {\n  background-color: var(--darkWww-button-text);\n}\n.preview .remix-button,\n.os-chooser .button:not(.active),\n.card .card-button,\n.initiatives-section .video-background.abhi .button,\n.initiatives-section .video-background.cps .button {\n  color: white;\n}\n.inplace-input:focus,\n.inplace-textarea:focus,\n.textarea:focus,\n.outer .categories li,\n.unsupported-browser .back-button,\nbody:not(.sa-body-editor) .formik-input:focus,\n.input:focus,\n.react-tel-input input[type=\"tel\"]:focus {\n  border-color: var(--darkWww-button);\n}\n.studio-tile-added {\n  border-color: var(--darkWww-button) !important;\n}\n.promote-modal .cancel-button,\n.transfer-host-modal .cancel-button {\n  box-shadow: 0 0 0 1px var(--darkWww-button);\n}\n.button img,\n.preview .see-inside-button::before,\n.subactions .action-buttons .action-button::before,\n.studio-status-icon-plus-img,\n.studio-info .studio-info-footer-report button img,\n.studio-tab-nav .active > li img,\n.studio-tab-nav a.active.nav_link:hover > li img,\n#footer .inner .media li img {\n  filter: var(--darkWww-button-filter);\n}\n.forms-close-button img,\n.os-chooser .button:not(.active) img {\n  filter: none;\n}\n.input_label:hover {\n  background-color: var(--darkWww-button-transparent10);\n}\n.user-projects-modal .user-projects-modal-nav button:hover,\n.user-projects-modal .user-projects-modal-nav button.active:hover {\n  border-color: var(--darkWww-button-transparent10);\n}\n.outer .categories li:hover,\n.user-projects-modal .user-projects-modal-nav button:hover,\n.messages-admin-list .admin-message {\n  background-color: var(--darkWww-button-transparent25);\n}\n.comment .avatar {\n  box-shadow: 0 0 0 1px var(--darkWww-button-transparent25);\n}\n.inplace-input:focus,\n.inplace-textarea:focus,\n.studio-tile-added,\nbody:not(.sa-body-editor) .formik-input:focus {\n  box-shadow: 0 0 0 4px var(--darkWww-button-transparent25);\n}\nbody:not(.sa-body-editor) [class*=\"stage-header_stage-button_\"]:active {\n  background-color: var(--darkWww-button-transparent35);\n}\n.outer .categories li.active:hover,\n.studio-info .studio-info-footer-report button:hover,\n.studio-tab-nav a.active.nav_link:hover > li {\n  background-color: var(--darkWww-button-variant);\n  color: var(--darkWww-button-text);\n}\n.intro-banner .intro-container,\n.title-banner.mod-messages,\n.download .download-header,\n.link .extension-header /* Scratch Link download */,\n.information-page .title-banner.masthead,\n.modal-flush-bottom-button {\n  background-color: var(--darkWww-button-banner);\n}\n.modal-flush-bottom-button:hover {\n  background-color: var(--darkWww-button-bannerVariant);\n}\n\n/* Link color */\na,\na:link,\na:visited,\nbody:not(.sa-body-editor) .button.white,\n.news li h4,\n.intro-banner .intro-button,\n.hoc-banner .hoc-more-activities,\n.hoc-banner .hoc-banner-image .hoc-image-text,\n.feature-banner .feature-learn-more,\n.feature-banner .feature-banner-image .feature-image-text,\n.outer .categories li,\n.unsupported-browser .faq-link,\na.social-messages-profile-link:hover,\na.social-messages-profile-link:active,\n.comment .comment-body .comment-bottom-row .comment-reply,\n.studio-adder-section h3,\n.studio-project-tile .studio-project-title,\n.studio-member-tile .studio-member-name,\n.studio-thumb-edit-button,\n.studio-manager-count,\n.promote-modal .cancel-button,\n.transfer-host-modal .cancel-button {\n  color: var(--darkWww-link);\n}\n.studio-manager-count {\n  border-color: var(--darkWww-link);\n}\n.user-projects-modal .studio-projects-empty-text {\n  color: var(--darkWww-link-transparent);\n}\na:hover {\n  color: var(--darkWww-link-hover);\n}\n.sa-annual-report-2020 a,\n.sa-annual-report-2020 a:link,\n.sa-annual-report-2020 a:visited,\n.sa-annual-report-2020 a:active {\n  color: #3373cc;\n}\n.banner a,\n.privacy-banner a,\n.subnavigation a,\n.subnavigation a:active {\n  color: white;\n}\n.hoc-banner .hoc-more-activities img,\n.comment .comment-body .comment-bottom-row .comment-reply::after,\n.comment-status-icon,\n.studio-thumb-edit-img,\n.studio-activity .studio-activity-icon,\n.download .older-version .little-arrow,\n.transfer-host-modal .transfer-outcome-arrow {\n  filter: var(--darkWww-link-iconFilter);\n}\n\n/* Footer background */\n#footer,\n#donor,\n.gray-area,\n.parents .title-banner.faq-banner,\n.developers .title-banner.faq-banner {\n  background-color: var(--darkWww-footer);\n  color: var(--darkWww-footer-text);\n}\n.developers #faq p {\n  color: var(--darkWww-footer-text);\n}\nimg.tips-icon {\n  filter: var(--darkWww-footer-filter);\n}\n\n/* Border color */\n.tips-divider,\n.about .masthead div li:nth-child(odd),\n.about .body,\n.about .body img,\n.about .body iframe,\n.preview .remix-credit,\n.preview .project-description,\n.commenting-status,\n.avatar-item img,\n.filter-container,\n.tab-choice-sa,\n.tab-choice-selected-sa {\n  border-color: var(--darkWww-border-5);\n}\nbody:not(.sa-body-editor) .select select,\n.textarea,\n.action-button.close-button,\n.sa-collapse-footer #footer,\n.empty,\n.outer .sort-controls,\n.preview .comments-container .comments-turned-off,\n.comment .comment-body .comment-bubble,\n.comment .comment-body .comment-bubble::before,\n.studio-tab-nav a.nav_link:hover > li,\n.studio-info-box,\n.developers #faq,\np.callout,\n#footer .inner .collaborators,\n.input,\n.row .col-sm-9 input[type=\"radio\"]:not(:checked),\n.extension-landing .tip-box {\n  border-color: var(--darkWww-border);\n}\n.grid .thumbnail,\n.ttt-tile,\n.thumbnail-column .thumbnail .thumbnail-image {\n  box-shadow: 0 0 0 1px var(--darkWww-border);\n}\n.expand-thread::before,\n.expand-thread::after {\n  background-color: var(--darkWww-border);\n}\n.crash-container,\n.news li:nth-child(even),\n.thumbnail .thumbnail-image img,\n.video-player,\n.ttt-content-chunk + .ttt-content-chunk,\n.messages-social-list,\n.social-message,\n.comment-text,\n.comment-text::before,\nbody:not(.sa-body-editor) [class*=\"stage_stage_\"],\nbody:not(.sa-body-editor) [class*=\"stage-header_stage-button_\"],\n.social-form,\n.studio-info .studio-image,\n.studio-report-modal .studio-report-tile-image,\n.studio-tab-nav a.nav_link > li,\n.studio-project-tile,\n.studio-adder-section .studio-adder-row input,\n.studio-adder-section .studio-adder-row .studio-adder-vertical-divider,\n.user-projects-modal .user-projects-modal-nav button,\n.studio-member-tile,\n.studio-activity .studio-messages-list,\n.developers #projects h3,\n.developers #principles h3,\n.developers #donate,\n.information-page .info-outer nav,\n.conf2021-panel,\n.conf2019-panel,\n.conf2019-panel-flag,\n.conf2017-panel,\n.conf2017-panel-flag,\n.expect .schedule table th,\n.expect .schedule table td,\n.plan section,\n.plan .faq .short,\n.supporters-section .supporters-level hr,\nbody:not(.sa-body-editor) input[type=\"radio\"].formik-radio-button,\n.extension-landing hr,\n.extension-landing .screenshot,\n.extension-landing .project-card,\n.extension-landing .hardware-card,\n.transfer-host-modal .transfer-password-input,\n.cookies-table td,\n.cookies-table th,\n.comments-container .sa-emoji-picker,\n.studio-compose-container .sa-emoji-picker,\n.sa-emoji-picker-divider {\n  border-color: var(--darkWww-border-15);\n}\n.navigation .dot {\n  background-color: var(--darkWww-border-15);\n}\n.navigation .dot.active {\n  background-color: #4d97ff;\n}\n.compose-comment .textarea-row textarea:not(:focus),\n.studio-tab-nav,\n.messages-admin-list .admin-message,\nbody:not(.sa-body-editor) .formik-input,\nbody:not(.sa-body-editor) input[type=\"checkbox\"].formik-checkbox:not(:checked),\n.row .checkbox input[type=\"checkbox\"]:not(:checked) {\n  border-color: var(--darkWww-border-20);\n}\n.studio-tab-nav a.nav_link.active > li,\n.user-projects-modal .user-projects-modal-nav button.active {\n  border-color: rgba(0, 0, 0, 0.15);\n}\n\n/* Message count */\n#navigation .messages .message-count.show {\n  background-color: var(--darkWww-messageIndicatorColor);\n  color: var(--darkWww-messageIndicatorColor-text);\n}\n.messages-header-unread {\n  background-color: var(--darkWww-messageIndicatorOnMessagesPage);\n  color: var(--darkWww-messageIndicatorOnMessagesPage-text);\n}\n\n/* Miscellaneous styles */\n\n:root {\n  /* URLs defined here because addon.json can't use ../../addons/dark-www */\n  --darkWww-caretBlack: url(\"../../addons/dark-www/assets/caret_transparent.svg\");\n  --darkWww-caretWhite: url(\"../../addons/dark-www/assets/caret_white.svg\");\n  --darkWww-caretBlackHover: url(\"../../addons/dark-www/assets/caret_transparent_hover.svg\");\n  --darkWww-caretWhiteHover: url(\"../../addons/dark-www/assets/caret_white_hover.svg\");\n}\n\nh1,\nh2,\nh3,\nh4,\nh5,\np {\n  color: inherit;\n}\n\n/* Some images are designed for a light background: */\n.preview .comments-container .comment-placeholder-img,\n.studio-comment-placholder-img {\n  width: calc(100% - 30px);\n  padding: 15px;\n  background-color: #e9f1fc;\n  border-radius: 8px;\n}\n.studio-empty-img {\n  margin-top: 30px;\n  margin-bottom: 10px;\n  padding: 15px;\n  background-color: #e9f1fc;\n  border-radius: 8px;\n}\n#footer .inner .collaborators li {\n  padding: 0 4px;\n  background-color: #f2f2f2;\n  border-radius: 8px;\n}\n\n.guiPlayer,\n.sa-annual-report-2021 .initiatives-section .year-in-review {\n  color: #575e75;\n}\n\n.intro-banner {\n  background: transparent;\n}\n\n.emoji[src$=\"meow.png\"] {\n  content: url(../../addons/dark-www/assets/meow.png);\n}\n.emoji[src$=\"gobo.png\"] {\n  content: url(../../addons/dark-www/assets/gobo.png);\n}\n.emoji[src$=\"waffle.png\"] {\n  content: url(../../addons/dark-www/assets/waffle.png);\n}\n\n.banner /* confirm email */ {\n  /* Fix ugly gray shadow */\n  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);\n}\n.wedo .banner {\n  box-shadow: none;\n}\n\n.initiatives-access > .green {\n  /* Change the solid color background to a transparent one */\n  background-color: rgba(0, 165, 0, 0.07);\n}\n\n.twitter-tweet iframe {\n  /* If the color scheme of an iframe element is different from that\n     of the document inside, it gets an opaque backgound. */\n  color-scheme: light;\n}\n\n/*# sourceURL=experimental_scratchwww.css */",
                    "index": 1
                }
            ],
            "cssVariables": [
                {
                    "name": "page-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-transparentText",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.3)",
                        "white": "rgba(255, 255, 255, 0.4)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-tab",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.1)",
                        "white": "rgba(255, 255, 255, 0.1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-filter",
                    "value": {
                        "type": "textColor",
                        "black": "none",
                        "white": "brightness(0) invert(1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-eyeFilter",
                    "value": {
                        "type": "textColor",
                        "black": "none",
                        "white": "invert(1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-colorScheme",
                    "value": {
                        "type": "textColor",
                        "black": "light",
                        "white": "dark",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        },
                        "threshold": 128
                    }
                },
                {
                    "name": "page-ideas",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        },
                        "r": 0.99,
                        "g": 0.99,
                        "b": 0.99,
                        "a": 1
                    }
                },
                {
                    "name": "page-scratchr2Text",
                    "value": {
                        "type": "textColor",
                        "black": "#322f31",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-scratchr2HeaderText",
                    "value": {
                        "type": "textColor",
                        "black": "#554747",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-scratchr2LabelText",
                    "value": {
                        "type": "textColor",
                        "black": "#333333",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "navbar-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "navbar"
                        }
                    }
                },
                {
                    "name": "navbar-transparentText",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(87, 94, 117, 0.75)",
                        "white": "rgba(255, 255, 255, 0.75)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "navbar"
                        }
                    }
                },
                {
                    "name": "navbar-filter",
                    "value": {
                        "type": "textColor",
                        "black": "brightness(0.4)",
                        "white": "none",
                        "source": {
                            "type": "settingValue",
                            "settingId": "navbar"
                        }
                    }
                },
                {
                    "name": "navbar-border",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.1)",
                        "white": "rgba(255, 255, 255, 0.1)",
                        "threshold": 60,
                        "source": {
                            "type": "settingValue",
                            "settingId": "navbar"
                        }
                    }
                },
                {
                    "name": "navbar-inputFocus",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.2)",
                        "white": "rgba(255, 255, 255, 0.2)",
                        "threshold": 60,
                        "source": {
                            "type": "settingValue",
                            "settingId": "navbar"
                        }
                    }
                },
                {
                    "name": "navbar-variant",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "navbar"
                        },
                        "r": 0.86,
                        "g": 0.85,
                        "b": 0.84,
                        "a": 1
                    }
                },
                {
                    "name": "navbar-scratchr2",
                    "value": {
                        "type": "map",
                        "source": {
                            "type": "settingValue",
                            "settingId": "navbar"
                        },
                        "options": {
                            "#4d97ff": "#0f8bc0",
                            "#4d97ffff": "#0f8bc0",
                            "#25aff4": "#0f8bc0",
                            "#25aff4ff": "#0f8bc0"
                        },
                        "default": {
                            "type": "settingValue",
                            "settingId": "navbar"
                        }
                    }
                },
                {
                    "name": "navbar-scratchr2Text",
                    "value": {
                        "type": "textColor",
                        "black": "#322f31",
                        "source": {
                            "type": "settingValue",
                            "settingId": "navbar"
                        }
                    }
                },
                {
                    "name": "navbar-scratchr2ShadowFilter",
                    "value": {
                        "type": "textColor",
                        "black": "drop-shadow(0 0 1px rgba(0, 0, 0, 0.2))",
                        "white": "none",
                        "source": {
                            "type": "settingValue",
                            "settingId": "navbar"
                        }
                    }
                },
                {
                    "name": "navbar-scratchr2ItemHover",
                    "value": {
                        "type": "map",
                        "source": {
                            "type": "settingValue",
                            "settingId": "navbar"
                        },
                        "options": {
                            "#4d97ff": "#0c6185",
                            "#4d97ffff": "#0c6185",
                            "#0f8bc0": "#0c6185",
                            "#0f8bc0ff": "#0c6185",
                            "#25aff4": "#0c6185",
                            "#25aff4ff": "#0c6185"
                        },
                        "default": {
                            "type": "textColor",
                            "black": "rgba(0, 0, 0, 0.1)",
                            "white": "rgba(255, 255, 255, 0.1)",
                            "source": {
                                "type": "settingValue",
                                "settingId": "navbar"
                            },
                            "threshold": 60
                        }
                    }
                },
                {
                    "name": "box-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-transparentText",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.3)",
                        "white": "rgba(255, 255, 255, 0.4)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-inputPlaceholder",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(87, 94, 117, 0.6)",
                        "white": "rgba(255, 255, 255, 0.4)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-borderText",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "alphaBlend",
                            "opaqueSource": {
                                "type": "settingValue",
                                "settingId": "box"
                            },
                            "transparentSource": {
                                "type": "brighten",
                                "source": {
                                    "type": "settingValue",
                                    "settingId": "border"
                                },
                                "a": 0.94,
                                "r": 1,
                                "g": 1,
                                "b": 1
                            }
                        }
                    }
                },
                {
                    "name": "box-filter",
                    "value": {
                        "type": "textColor",
                        "black": "none",
                        "white": "brightness(0) invert(1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-eyeFilter",
                    "value": {
                        "type": "textColor",
                        "black": "none",
                        "white": "invert(1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-filterInverted",
                    "value": {
                        "type": "textColor",
                        "black": "brightness(0.4)",
                        "white": "none",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-borderFilterInverted",
                    "value": {
                        "type": "textColor",
                        "black": "brightness(0.4)",
                        "white": "none",
                        "source": {
                            "type": "alphaBlend",
                            "opaqueSource": {
                                "type": "settingValue",
                                "settingId": "box"
                            },
                            "transparentSource": {
                                "type": "brighten",
                                "source": {
                                    "type": "settingValue",
                                    "settingId": "border"
                                },
                                "a": 0.94,
                                "r": 1,
                                "g": 1,
                                "b": 1
                            }
                        }
                    }
                },
                {
                    "name": "box-border",
                    "value": {
                        "type": "alphaBlend",
                        "opaqueSource": {
                            "type": "settingValue",
                            "settingId": "box"
                        },
                        "transparentSource": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "border"
                            },
                            "a": 0.94,
                            "r": 1,
                            "g": 1,
                            "b": 1
                        }
                    }
                },
                {
                    "name": "box-tab",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.1)",
                        "white": "rgba(255, 255, 255, 0.1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-tabHover",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.2)",
                        "white": "rgba(255, 255, 255, 0.2)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-greenText",
                    "value": {
                        "type": "textColor",
                        "black": "#328554",
                        "white": "#13ecaf",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-buttonDisabled",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.2)",
                        "white": "rgba(255, 255, 255, 0.2)",
                        "threshold": 32,
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-messageIconOpacity",
                    "value": {
                        "type": "textColor",
                        "black": 0.25,
                        "white": 0.5,
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-studioReportTile",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.05)",
                        "white": "rgba(255, 255, 255, 0.05)",
                        "threshold": 32,
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-caret",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-caretBlack)",
                        "white": "var(--darkWww-caretWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-colorScheme",
                    "value": {
                        "type": "textColor",
                        "black": "light",
                        "white": "dark",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        },
                        "threshold": 128
                    }
                },
                {
                    "name": "box-success",
                    "value": {
                        "type": "alphaBlend",
                        "opaqueSource": {
                            "type": "settingValue",
                            "settingId": "box"
                        },
                        "transparentSource": "#08bd8c33"
                    }
                },
                {
                    "name": "box-error",
                    "value": {
                        "type": "alphaBlend",
                        "opaqueSource": {
                            "type": "settingValue",
                            "settingId": "box"
                        },
                        "transparentSource": "#ff8c1a23"
                    }
                },
                {
                    "name": "box-embedLoader",
                    "value": {
                        "type": "textColor",
                        "black": "#4d97ff",
                        "white": {
                            "type": "settingValue",
                            "settingId": "box"
                        },
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-scratchr2Text",
                    "value": {
                        "type": "textColor",
                        "black": "#322f31",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-scratchr2HeaderText",
                    "value": {
                        "type": "textColor",
                        "black": "#554747",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-scratchr2LabelText",
                    "value": {
                        "type": "textColor",
                        "black": "#333333",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-scratchr2ButtonText",
                    "value": {
                        "type": "textColor",
                        "black": "#666666",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-scratchr2Caret",
                    "value": {
                        "type": "textColor",
                        "black": "#000000",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-scratchr2InputText",
                    "value": {
                        "type": "textColor",
                        "black": "#555555",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-scratchr2InputPlaceholder",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.27)",
                        "white": "rgba(255, 255, 255, 0.4)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-scratchr2GrayText",
                    "value": {
                        "type": "textColor",
                        "black": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "box"
                            },
                            "r": 0.53,
                            "g": 0.53,
                            "b": 0.53,
                            "a": 1
                        },
                        "white": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "box"
                            },
                            "r": 0.25,
                            "g": 0.25,
                            "b": 0.25,
                            "a": 1
                        },
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-scratchr2BlackText",
                    "value": {
                        "type": "textColor",
                        "black": "#000000",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-scratchr2Border",
                    "value": {
                        "type": "alphaBlend",
                        "opaqueSource": {
                            "type": "settingValue",
                            "settingId": "box"
                        },
                        "transparentSource": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "border"
                            },
                            "a": 0.98,
                            "r": 1,
                            "g": 1,
                            "b": 1
                        }
                    }
                },
                {
                    "name": "box-scratchr2ButtonGradientTop",
                    "value": {
                        "type": "textColor",
                        "black": {
                            "type": "settingValue",
                            "settingId": "box"
                        },
                        "white": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "box"
                            },
                            "r": 0.8,
                            "g": 0.8,
                            "b": 0.8,
                            "a": 1
                        },
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-scratchr2ButtonGradientBottom",
                    "value": {
                        "type": "textColor",
                        "black": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "box"
                            },
                            "r": 0.8,
                            "g": 0.8,
                            "b": 0.8,
                            "a": 1
                        },
                        "white": {
                            "type": "settingValue",
                            "settingId": "box"
                        },
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-scratchr2ButtonHover",
                    "value": {
                        "type": "textColor",
                        "black": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "box"
                            },
                            "r": 0.9,
                            "g": 0.9,
                            "b": 0.9,
                            "a": 1
                        },
                        "white": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "box"
                            },
                            "r": 0.9,
                            "g": 0.9,
                            "b": 0.9,
                            "a": 1
                        },
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-scratchr2ButtonBorder",
                    "value": {
                        "type": "alphaBlend",
                        "opaqueSource": {
                            "type": "settingValue",
                            "settingId": "box"
                        },
                        "transparentSource": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "border"
                            },
                            "a": 0.67,
                            "r": 1,
                            "g": 1,
                            "b": 1
                        }
                    }
                },
                {
                    "name": "box-scratchr2DropdownItemHover",
                    "value": {
                        "type": "textColor",
                        "black": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "box"
                            },
                            "r": 0.93,
                            "g": 0.93,
                            "b": 0.93,
                            "a": 1
                        },
                        "white": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "box"
                            },
                            "r": 0.93,
                            "g": 0.93,
                            "b": 0.93,
                            "a": 1
                        },
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "gray-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-boxHighlight",
                    "value": {
                        "type": "textColor",
                        "black": {
                            "type": "textColor",
                            "black": "#ffffff",
                            "white": {
                                "type": "brighten",
                                "source": {
                                    "type": "settingValue",
                                    "settingId": "gray"
                                },
                                "r": 0.87,
                                "g": 0.87,
                                "b": 0.87,
                                "a": 1
                            },
                            "threshold": 224,
                            "source": {
                                "type": "settingValue",
                                "settingId": "gray"
                            }
                        },
                        "white": "transparent",
                        "threshold": {
                            "type": "settingValue",
                            "settingId": "border"
                        },
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-tab",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.1)",
                        "white": "rgba(255, 255, 255, 0.1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-caret",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-caretBlack)",
                        "white": "var(--darkWww-caretWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-caretHover",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-caretBlackHover)",
                        "white": "var(--darkWww-caretWhiteHover)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-filter",
                    "value": {
                        "type": "textColor",
                        "black": "none",
                        "white": "brightness(0) invert(1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-eyeFilter",
                    "value": {
                        "type": "textColor",
                        "black": "none",
                        "white": "invert(1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-filterInverted",
                    "value": {
                        "type": "textColor",
                        "black": "brightness(0.4)",
                        "white": "none",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-darker",
                    "value": {
                        "type": "textColor",
                        "black": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "gray"
                            },
                            "r": 0.74,
                            "g": 0.74,
                            "b": 0.74,
                            "a": 1
                        },
                        "white": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "gray"
                            },
                            "r": 0.78,
                            "g": 0.78,
                            "b": 0.78,
                            "a": 1
                        },
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-scratchr2",
                    "value": {
                        "type": "map",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        },
                        "options": {
                            "#f2f2f2": "#f7f7f7",
                            "#f2f2f2ff": "#f7f7f7"
                        },
                        "default": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-scratchr2Text",
                    "value": {
                        "type": "textColor",
                        "black": "#322f31",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-scratchr2HeaderText",
                    "value": {
                        "type": "textColor",
                        "black": "#554747",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-scratchr2GrayText",
                    "value": {
                        "type": "textColor",
                        "black": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "gray"
                            },
                            "r": 0.55,
                            "g": 0.55,
                            "b": 0.55,
                            "a": 1
                        },
                        "white": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "gray"
                            },
                            "r": 0.25,
                            "g": 0.25,
                            "b": 0.25,
                            "a": 1
                        },
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-scratchr2BlackText",
                    "value": {
                        "type": "textColor",
                        "black": "#000000",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-scratchr2LabelText",
                    "value": {
                        "type": "textColor",
                        "black": "#333333",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-scratchr2ButtonText",
                    "value": {
                        "type": "textColor",
                        "black": "#666666",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-mobilePaginationText",
                    "value": {
                        "type": "textColor",
                        "black": "#555555",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-scratchr2SelectedTab",
                    "value": {
                        "type": "textColor",
                        "black": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "gray"
                            },
                            "r": 0.63,
                            "g": 0.63,
                            "b": 0.63,
                            "a": 1
                        },
                        "white": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "gray"
                            },
                            "r": 0.63,
                            "g": 0.63,
                            "b": 0.63,
                            "a": 1
                        },
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-scratchr2TableHeader",
                    "value": {
                        "type": "map",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        },
                        "options": {
                            "#f2f2f2": "#eeeeee",
                            "#f2f2f2ff": "#eeeeee"
                        },
                        "default": {
                            "type": "textColor",
                            "black": {
                                "type": "multiply",
                                "source": {
                                    "type": "settingValue",
                                    "settingId": "gray"
                                },
                                "r": 0.96,
                                "g": 0.96,
                                "b": 0.96
                            },
                            "white": {
                                "type": "brighten",
                                "source": {
                                    "type": "settingValue",
                                    "settingId": "gray"
                                },
                                "r": 0.96,
                                "g": 0.96,
                                "b": 0.96
                            },
                            "source": {
                                "type": "settingValue",
                                "settingId": "gray"
                            }
                        }
                    }
                },
                {
                    "name": "gray-scratchr2TableCell",
                    "value": {
                        "type": "map",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        },
                        "options": {
                            "#f2f2f2": "#f5f5f5",
                            "#f2f2f2ff": "#f5f5f5",
                            "#f7f7f7": "#f5f5f5",
                            "#f7f7f7ff": "#f5f5f5"
                        },
                        "default": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-forumTransparentQuote",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.03)",
                        "white": "rgba(255, 255, 255, 0.03)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "gray"
                        }
                    }
                },
                {
                    "name": "gray-forumTransparentCode",
                    "value": {
                        "type": "ternary",
                        "source": {
                            "type": "settingValue",
                            "settingId": "darkForumCode"
                        },
                        "true": {
                            "type": "textColor",
                            "black": "#333333",
                            "white": "rgba(255, 255, 255, 0.03)",
                            "source": {
                                "type": "settingValue",
                                "settingId": "gray"
                            },
                            "threshold": 64
                        },
                        "false": {
                            "type": "textColor",
                            "black": "rgba(0, 0, 0, 0.03)",
                            "white": "#f7f7f7",
                            "source": {
                                "type": "settingValue",
                                "settingId": "gray"
                            },
                            "threshold": 204
                        }
                    }
                },
                {
                    "name": "blue-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "blue"
                        }
                    }
                },
                {
                    "name": "blue-filter",
                    "value": {
                        "type": "textColor",
                        "black": "none",
                        "white": "brightness(0) invert(1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "blue"
                        }
                    }
                },
                {
                    "name": "blue-tab",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.1)",
                        "white": "rgba(255, 255, 255, 0.1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "blue"
                        }
                    }
                },
                {
                    "name": "blue-tabHover",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.2)",
                        "white": "rgba(255, 255, 255, 0.2)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "blue"
                        }
                    }
                },
                {
                    "name": "blue-studioTextareaBorder",
                    "value": {
                        "type": "makeHsv",
                        "h": {
                            "type": "settingValue",
                            "settingId": "border"
                        },
                        "s": {
                            "type": "settingValue",
                            "settingId": "border"
                        },
                        "v": {
                            "type": "alphaBlend",
                            "opaqueSource": {
                                "type": "settingValue",
                                "settingId": "blue"
                            },
                            "transparentSource": {
                                "type": "brighten",
                                "source": {
                                    "type": "settingValue",
                                    "settingId": "border"
                                },
                                "a": 0.79,
                                "r": 1,
                                "g": 1,
                                "b": 1
                            }
                        }
                    }
                },
                {
                    "name": "blue-colorScheme",
                    "value": {
                        "type": "textColor",
                        "black": "light",
                        "white": "dark",
                        "source": {
                            "type": "settingValue",
                            "settingId": "blue"
                        },
                        "threshold": 128
                    }
                },
                {
                    "name": "blue-20",
                    "value": {
                        "type": "textColor",
                        "black": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "blue"
                            },
                            "r": 0.93,
                            "g": 0.96,
                            "b": 1,
                            "a": 1
                        },
                        "white": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "blue"
                            },
                            "r": 0.96,
                            "g": 0.96,
                            "b": 0.96,
                            "a": 1
                        },
                        "source": {
                            "type": "settingValue",
                            "settingId": "blue"
                        }
                    }
                },
                {
                    "name": "blue-25",
                    "value": {
                        "type": "textColor",
                        "black": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "blue"
                            },
                            "r": 0.89,
                            "g": 0.94,
                            "b": 1,
                            "a": 1
                        },
                        "white": {
                            "type": "settingValue",
                            "settingId": "blue"
                        },
                        "source": {
                            "type": "settingValue",
                            "settingId": "blue"
                        }
                    }
                },
                {
                    "name": "blue-opacity0",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "blue"
                        },
                        "a": 0,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "input-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "input"
                        }
                    }
                },
                {
                    "name": "input-transparentText",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(87, 94, 117, 0.6)",
                        "white": "rgba(255, 255, 255, 0.4)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "input"
                        }
                    }
                },
                {
                    "name": "input-caret",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-caretBlack)",
                        "white": "var(--darkWww-caretWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "input"
                        }
                    }
                },
                {
                    "name": "input-caretHover",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-caretBlackHover)",
                        "white": "var(--darkWww-caretWhiteHover)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "input"
                        }
                    }
                },
                {
                    "name": "input-scratchr2Text",
                    "value": {
                        "type": "textColor",
                        "black": "#322f31",
                        "source": {
                            "type": "settingValue",
                            "settingId": "input"
                        }
                    }
                },
                {
                    "name": "button-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "button"
                        }
                    }
                },
                {
                    "name": "button-filter",
                    "value": {
                        "type": "textColor",
                        "black": "brightness(0.4)",
                        "white": "none",
                        "source": {
                            "type": "settingValue",
                            "settingId": "button"
                        }
                    }
                },
                {
                    "name": "button-filterInverted",
                    "value": {
                        "type": "textColor",
                        "black": "none",
                        "white": "brightness(0) invert(1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "button"
                        }
                    }
                },
                {
                    "name": "button-transparent10",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "button"
                        },
                        "a": 0.1,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "button-transparent25",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "button"
                        },
                        "a": 0.25,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "button-transparent35",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "button"
                        },
                        "a": 0.35,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "highlight-transparent20",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "button"
                        },
                        "a": 0.2,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "button-overlay",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "button"
                        },
                        "a": 0.7,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "button-variant",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "button"
                        },
                        "r": 0.9,
                        "g": 0.9,
                        "b": 0.9,
                        "a": 1
                    }
                },
                {
                    "name": "button-banner",
                    "value": {
                        "type": "makeHsv",
                        "h": {
                            "type": "settingValue",
                            "settingId": "button"
                        },
                        "s": {
                            "type": "map",
                            "source": {
                                "type": "settingValue",
                                "settingId": "darkBanners"
                            },
                            "options": {
                                "off": 0.57,
                                "darker": 0.57,
                                "desaturated": 0.3
                            }
                        },
                        "v": {
                            "type": "map",
                            "source": {
                                "type": "settingValue",
                                "settingId": "darkBanners"
                            },
                            "options": {
                                "off": 0.84,
                                "darker": 0.4,
                                "desaturated": 0.35
                            }
                        }
                    }
                },
                {
                    "name": "button-bannerVariant",
                    "value": {
                        "type": "makeHsv",
                        "h": {
                            "type": "settingValue",
                            "settingId": "button"
                        },
                        "s": {
                            "type": "map",
                            "source": {
                                "type": "settingValue",
                                "settingId": "darkBanners"
                            },
                            "options": {
                                "off": 0.56,
                                "darker": 0.56,
                                "desaturated": 0.3
                            }
                        },
                        "v": {
                            "type": "map",
                            "source": {
                                "type": "settingValue",
                                "settingId": "darkBanners"
                            },
                            "options": {
                                "off": 0.75,
                                "darker": 0.35,
                                "desaturated": 0.3
                            }
                        }
                    }
                },
                {
                    "name": "button-scratchr2",
                    "value": {
                        "type": "map",
                        "source": {
                            "type": "settingValue",
                            "settingId": "button"
                        },
                        "options": {
                            "#4d97ff": "#18abeb",
                            "#4d97ffff": "#18abeb",
                            "#25aff4": "#18abeb",
                            "#25aff4ff": "#18abeb"
                        },
                        "default": {
                            "type": "settingValue",
                            "settingId": "button"
                        }
                    }
                },
                {
                    "name": "button-scratchr2Hover",
                    "value": {
                        "type": "map",
                        "source": {
                            "type": "settingValue",
                            "settingId": "button"
                        },
                        "options": {
                            "#4d97ff": "#169fdb",
                            "#4d97ffff": "#169fdb",
                            "#18abeb": "#169fdb",
                            "#18abebff": "#169fdb",
                            "#25aff4": "#169fdb",
                            "#25aff4ff": "#169fdb"
                        },
                        "default": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "button"
                            },
                            "r": 0.9,
                            "g": 0.9,
                            "b": 0.9
                        }
                    }
                },
                {
                    "name": "button-scratchr2ButtonText",
                    "value": {
                        "type": "textColor",
                        "black": "#666666",
                        "source": {
                            "type": "settingValue",
                            "settingId": "button"
                        }
                    }
                },
                {
                    "name": "button-scratchr2PostHeaderText",
                    "value": {
                        "type": "textColor",
                        "black": "#322f31",
                        "source": {
                            "type": "settingValue",
                            "settingId": "button"
                        }
                    }
                },
                {
                    "name": "button-scratchr2InputFocusShadow",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "button"
                        },
                        "a": 0.6,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "button-scratchr2PostHeader",
                    "value": {
                        "type": "map",
                        "source": {
                            "type": "settingValue",
                            "settingId": "button"
                        },
                        "options": {
                            "#4d97ff": "#28a5da",
                            "#4d97ffff": "#28a5da",
                            "#18abeb": "#28a5da",
                            "#18abebff": "#28a5da",
                            "#25aff4": "#28a5da",
                            "#25aff4ff": "#28a5da"
                        },
                        "default": {
                            "type": "settingValue",
                            "settingId": "button"
                        }
                    }
                },
                {
                    "name": "link-transparent",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "link"
                        },
                        "a": 0.75,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "link-hover",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "link"
                        },
                        "r": 0.9,
                        "g": 0.9,
                        "b": 0.9,
                        "a": 1
                    }
                },
                {
                    "name": "link-iconFilter",
                    "value": {
                        "type": "recolorFilter",
                        "source": {
                            "type": "settingValue",
                            "settingId": "link"
                        }
                    }
                },
                {
                    "name": "link-hoverIconFilter",
                    "value": {
                        "type": "recolorFilter",
                        "source": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "link"
                            },
                            "r": 0.86,
                            "g": 0.85,
                            "b": 0.84,
                            "a": 1
                        }
                    }
                },
                {
                    "name": "link-scratchr2",
                    "value": {
                        "type": "map",
                        "source": {
                            "type": "settingValue",
                            "settingId": "link"
                        },
                        "options": {
                            "#4d97ff": "#1aa0d8",
                            "#4d97ffff": "#1aa0d8",
                            "#25aff4": "#1aa0d8",
                            "#25aff4ff": "#1aa0d8"
                        },
                        "default": {
                            "type": "settingValue",
                            "settingId": "link"
                        }
                    }
                },
                {
                    "name": "footer-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "footer"
                        }
                    }
                },
                {
                    "name": "footer-filter",
                    "value": {
                        "type": "textColor",
                        "black": "none",
                        "white": "brightness(0) invert(1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "footer"
                        }
                    }
                },
                {
                    "name": "footer-scratchr2",
                    "value": {
                        "type": "map",
                        "source": {
                            "type": "settingValue",
                            "settingId": "footer"
                        },
                        "options": {
                            "#f2f2f2": "#ececec",
                            "#f2f2f2ff": "#ececec"
                        },
                        "default": {
                            "type": "settingValue",
                            "settingId": "footer"
                        }
                    }
                },
                {
                    "name": "footer-scratchr2Text",
                    "value": {
                        "type": "textColor",
                        "black": "#666666",
                        "source": {
                            "type": "settingValue",
                            "settingId": "footer"
                        }
                    }
                },
                {
                    "name": "border-5",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "border"
                        },
                        "a": 0.5,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "border-15",
                    "value": {
                        "type": "brighten",
                        "source": {
                            "type": "settingValue",
                            "settingId": "border"
                        },
                        "a": 0.94,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "border-20",
                    "value": {
                        "type": "brighten",
                        "source": {
                            "type": "settingValue",
                            "settingId": "border"
                        },
                        "a": 0.89,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "border-33",
                    "value": {
                        "type": "brighten",
                        "source": {
                            "type": "settingValue",
                            "settingId": "border"
                        },
                        "a": 0.74,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "messageIndicatorColor-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "messageIndicatorColor"
                        },
                        "threshold": 180
                    }
                },
                {
                    "name": "messageIndicatorColor-scratchr2",
                    "value": {
                        "type": "map",
                        "source": {
                            "type": "settingValue",
                            "settingId": "messageIndicatorColor"
                        },
                        "options": {
                            "#ffab1a": "#f9a739",
                            "#ffab1aff": "#f9a739"
                        },
                        "default": {
                            "type": "settingValue",
                            "settingId": "messageIndicatorColor"
                        }
                    }
                },
                {
                    "name": "messageIndicatorColor-scratchr2Text",
                    "value": {
                        "type": "textColor",
                        "black": "#322f31",
                        "source": {
                            "type": "settingValue",
                            "settingId": "messageIndicatorColor"
                        },
                        "threshold": 180
                    }
                },
                {
                    "name": "messageIndicatorOnMessagesPage-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "messageIndicatorOnMessagesPage"
                        },
                        "threshold": 180
                    }
                },
                {
                    "name": "box-forumBoldButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumBoldButtonBlack)",
                        "white": "var(--darkWww-forumBoldButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-forumBrowserOsButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumBrowserOsButtonBlack)",
                        "white": "var(--darkWww-forumBrowserOsButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-forumItalicButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumItalicButtonBlack)",
                        "white": "var(--darkWww-forumItalicButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-forumListBulletButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumListBulletButtonBlack)",
                        "white": "var(--darkWww-forumListBulletButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-forumListItemButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumListItemButtonBlack)",
                        "white": "var(--darkWww-forumListItemButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-forumListNumericButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumListNumericButtonBlack)",
                        "white": "var(--darkWww-forumListNumericButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-forumStrokeButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumStrokeButtonBlack)",
                        "white": "var(--darkWww-forumStrokeButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-forumCenterButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumCenterButtonBlack)",
                        "white": "var(--darkWww-forumCenterButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "box-forumUnderlineButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumUnderlineButtonBlack)",
                        "white": "var(--darkWww-forumUnderlineButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                },
                {
                    "name": "page-forumBoldButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumBoldButtonBlack)",
                        "white": "var(--darkWww-forumBoldButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-forumBrowserOsButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumBrowserOsButtonBlack)",
                        "white": "var(--darkWww-forumBrowserOsButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-forumItalicButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumItalicButtonBlack)",
                        "white": "var(--darkWww-forumItalicButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-forumListBulletButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumListBulletButtonBlack)",
                        "white": "var(--darkWww-forumListBulletButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-forumListItemButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumListItemButtonBlack)",
                        "white": "var(--darkWww-forumListItemButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-forumListNumericButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumListNumericButtonBlack)",
                        "white": "var(--darkWww-forumListNumericButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-forumStrokeButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumStrokeButtonBlack)",
                        "white": "var(--darkWww-forumStrokeButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-forumCenterButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumCenterButtonBlack)",
                        "white": "var(--darkWww-forumCenterButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-forumUnderlineButton",
                    "value": {
                        "type": "textColor",
                        "black": "var(--darkWww-forumUnderlineButtonBlack)",
                        "white": "var(--darkWww-forumUnderlineButtonWhite)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-forumErrorColor",
                    "value": {
                        "type": "textColor",
                        "black": "red",
                        "white": "lightcoral",
                        "source": {
                            "type": "settingValue",
                            "settingId": "box"
                        }
                    }
                }
            ],
            "injectAsStyleElt": true,
            "index": 151
        },
        {
            "addonId": "editor-colored-context-menus",
            "styles": [
                {
                    "href": "../../addons/editor-colored-context-menus/userscript.css",
                    "text": ".sa-contextmenu-colored .blocklyContextMenu {\n  background-color: var(--sa-contextmenu-bg);\n  border-color: var(--sa-contextmenu-border);\n}\n.sa-contextmenu-colored .blocklyContextMenu .goog-menuitem-highlight,\n.sa-contextmenu-colored .s3dev-mi:hover {\n  background-color: #0001;\n  border-color: transparent !important;\n}\n.sa-contextmenu-colored .blocklyContextMenu .goog-menuitem[style*=\"border-top\"] {\n  border-top-color: var(--sa-contextmenu-border) !important;\n}\n.sa-contextmenu-colored .blocklyContextMenu .goog-menuitem .goog-menuitem-content {\n  color: white;\n}\n\n/*# sourceURL=userscript.css */",
                    "index": 0
                }
            ],
            "cssVariables": [],
            "injectAsStyleElt": true,
            "index": 162
        },
        {
            "addonId": "editor-dark-mode",
            "styles": [
                {
                    "href": "../../addons/editor-dark-mode/experimental_editor.css",
                    "text": "/* Page background */\n[class*=\"gui_body-wrapper_\"],\n[class*=\"gui_tab_\"]:not([class*=\"gui_is-selected_\"]):hover,\n[class*=\"backpack_backpack-item_\"] > div,\n[class*=\"custom-procedures_workspace_\"] .blocklySvg {\n  background-color: var(--editorDarkMode-page);\n  color: var(--editorDarkMode-page-text);\n}\n[class*=\"backpack_status-message_\"] {\n  color: var(--editorDarkMode-page-text);\n}\n[class*=\"gui_tab_\"]:not([class*=\"gui_is-selected_\"]):hover {\n  color: var(--editorDarkMode-page-transparentText);\n}\n[class*=\"gui_tab_\"]:not([class*=\"gui_is-selected_\"]):hover img {\n  filter: var(--editorDarkMode-page-tabHoverFilter);\n}\n[class*=\"loader_background_\"] {\n  background-color: var(--editorDarkMode-page-loader);\n}\n\n/* Menu bar background */\n[class*=\"menu-bar_menu-bar_\"],\n[class*=\"menu_menu_\"],\n[class*=\"menu_submenu_\"] > [class*=\"menu_menu_\"]::-webkit-scrollbar-track,\n[class*=\"modal_header_\"] {\n  background-color: var(--editorDarkMode-menuBar);\n  color: var(--editorDarkMode-menuBar-text);\n}\n[class*=\"menu_submenu_\"] > [class*=\"menu_menu_\"]::-webkit-scrollbar-thumb {\n  border-color: var(--editorDarkMode-menuBar);\n}\n[class*=\"menu-bar_menu-bar-item_\"],\n[class*=\"input_input-form_\"][class*=\"project-title-input_title-field_\"],\n[class*=\"author-info_author-info_\"],\n[class*=\"inline-message_info_\"],\n[class*=\"modal_header-item_\"] {\n  color: var(--editorDarkMode-menuBar-text);\n}\n[class*=\"share-button_share-button_\"],\n[class*=\"menu-bar_remix-button_\"] {\n  color: white;\n}\n[class*=\"inline-message_success_\"] {\n  color: var(--editorDarkMode-menuBar-dimText);\n}\n[class*=\"spinner_spinner_\"][class*=\"spinner_info_\"] {\n  border-color: var(--editorDarkMode-menuBar-transparentText);\n}\n[class*=\"spinner_spinner_\"][class*=\"spinner_info_\"]::after {\n  border-top-color: var(--editorDarkMode-menuBar-text);\n}\n[class*=\"menu-bar_file-group_\"] [class*=\"menu-bar_hoverable_\"] > img,\n[class*=\"menu-bar_menu-bar-menu_\"]\n  > [class*=\"menu_menu_\"]\n  > [class*=\"menu_menu-item_\"]:first-child\n  [class*=\"settings-menu_icon_\"] /* language icon */,\n[class*=\"settings-menu_expand-caret_\"],\n[class*=\"settings-menu_check_\"],\n[class*=\"menu-bar_help-icon_\"],\n[class*=\"community-button_community-button-icon_\"],\n[class*=\"menu-bar_mystuff-icon_\"],\n.sa-editormessages::before,\n[class*=\"account-nav_user-info_\"] [class*=\"account-nav_dropdown-caret-position_\"] img,\n[class*=\"modal_back-button_\"] [class*=\"button_icon_\"],\n[class*=\"modal_header-item-close_\"] [class*=\"close-button_close-icon_\"] {\n  filter: var(--editorDarkMode-menuBar-filter);\n}\n[class*=\"menu-bar_divider_\"],\n[class*=\"input_input-form_\"][class*=\"project-title-input_title-field_\"],\n[class*=\"project-title-input_title-field_\"]:hover:not(:focus),\n[class*=\"menu_menu-section_\"] {\n  border-color: var(--editorDarkMode-menuBar-border);\n}\n[class*=\"community-button_community-button_\"],\n[class*=\"user-avatar_user-thumbnail_\"] {\n  box-shadow: 0 0 0 1px var(--editorDarkMode-menuBar-border);\n}\n[class*=\"modal_header_\"] [class*=\"close-button_large_\"] {\n  background-color: var(--editorDarkMode-menuBar-border);\n  box-shadow: 0 0 0 2px var(--editorDarkMode-menuBar-border);\n}\n[class*=\"modal_header_\"] [class*=\"close-button_large_\"]:hover {\n  box-shadow: 0 0 0 4px var(--editorDarkMode-menuBar-border);\n}\n[class*=\"menu-bar_menu-bar-item_\"][class*=\"menu-bar_active_\"],\n[class*=\"menu-bar_menu-bar-item_\"][class*=\"menu-bar_hoverable_\"]:hover,\n[class*=\"menu_menu-item_\"][class*=\"menu_active_\"],\n[class*=\"menu_menu-item_\"]:hover,\n[class*=\"menu_submenu_\"] > [class*=\"menu_menu_\"]::-webkit-scrollbar-thumb {\n  background-color: var(--editorDarkMode-menuBar-border);\n}\n\n/* Active tab background */\n[class*=\"gui_tab_\"][class*=\"gui_is-selected_\"] {\n  background-color: var(--editorDarkMode-activeTab);\n}\n\n/* Inactive tab background */\n[class*=\"gui_tab_\"] {\n  background-color: var(--editorDarkMode-tab);\n  color: var(--editorDarkMode-tab-text);\n}\n[class*=\"gui_tab_\"] img {\n  filter: var(--editorDarkMode-tab-filter);\n}\n\n/* Sprite list background */\n[class*=\"sprite-selector_sprite-selector_\"],\n[class*=\"modal_modal-content_\"][class*=\"modal_full-screen_\"],\n[class*=\"library_library-scroll-grid_\"] {\n  background-color: var(--editorDarkMode-selector);\n  color-scheme: var(--editorDarkMode-selector-colorScheme);\n}\n[class*=\"sprite-selector-item_sprite-info_\"] {\n  color: var(--editorDarkMode-selector-text);\n}\n[class*=\"card_card_\"] {\n  border-color: var(--editorDarkMode-selector);\n}\n\n/* Asset list background */\n[class*=\"selector_wrapper_\"] {\n  background-color: var(--editorDarkMode-selector2);\n  color-scheme: var(--editorDarkMode-selector2-colorScheme);\n}\n[class*=\"sprite-selector-item_sprite-selector-item_\"],\n[class*=\"selector_list-item_\"] [class*=\"sprite-selector-item_sprite-info_\"] {\n  color: var(--editorDarkMode-selector2-text);\n}\n[class*=\"gui_tab-panel_\"]:nth-child(4) [class*=\"sprite-selector-item_sprite-image_\"] {\n  filter: var(--editorDarkMode-selector2-filter);\n}\n\n/* Selected list item background */\n[class*=\"sprite-selector-item_sprite-selector-item_\"]:hover,\n[class*=\"sprite-selector-item_sprite-selector-item_\"][class*=\"sprite-selector-item_is-selected_\"] {\n  background-color: var(--editorDarkMode-selectorSelection);\n  color: var(--editorDarkMode-selectorSelection-text);\n}\n[class*=\"sprite-selector-item_sprite-selector-item_\"]:not([class*=\"sprite-selector-item_is-selected_\"]):hover\n  [class*=\"sprite-selector-item_sprite-info_\"] {\n  color: var(--editorDarkMode-selectorSelection-text);\n}\n[class*=\"gui_tab-panel_\"]:nth-child(4)\n  [class*=\"sprite-selector-item_is-selected_\"]\n  [class*=\"sprite-selector-item_sprite-image_\"],\n[class*=\"gui_tab-panel_\"]:nth-child(4)\n  [class*=\"sprite-selector-item_sprite-selector-item_\"]:hover\n  [class*=\"sprite-selector-item_sprite-image_\"] {\n  filter: var(--editorDarkMode-selectorSelection-filter);\n}\n\n/* Accent background */\n[class*=\"backpack_backpack-header_\"],\n.sa-body-editor [class*=\"stage-header_stage-button_\"],\n.sa-body-editor [class*=\"stage-header_stage-size-row_\"] > *,\n.sa-body-editor [class*=\"stage-header_unselect-wrapper_\"],\n[class*=\"sprite-info_sprite-info_\"],\n[class*=\"stage-selector_stage-selector_\"],\n[class*=\"stage-selector_header_\"],\n.blocklyDropDownDiv .goog-slider-horizontal .goog-slider-thumb,\n[class*=\"asset-panel_wrapper_\"],\n[class*=\"color-button_outline-swatch_\"]::after,\n[class*=\"slider_handle_\"],\n[class*=\"sound-editor_button_\"],\n[class*=\"library-item_library-item_\"],\n.s3devDDOut.vis, /* devtools style */\n.sa-find-dropdown-out.visible, /* find-bar style */\n.sa-mcp-container, /* middle-click-popup style */\n[class*=\"prompt_body_\"],\n[class*=\"custom-procedures_body_\"],\n[class*=\"slider-prompt_body_\"],\n[class*=\"record-modal_body_\"],\n.sa-debugger-interface,\n.sa-debugger-tabs li.sa-debugger-tab-selected {\n  background-color: var(--editorDarkMode-accent);\n  color: var(--editorDarkMode-accent-text);\n  color-scheme: var(--editorDarkMode-accent-colorScheme);\n}\n[class*=\"color-button_color-button-swatch_\"][style=\"background: white;\"] {\n  background-color: var(--editorDarkMode-accent) !important;\n}\n[class*=\"stage-selector_header-title_\"],\n[class*=\"stage-selector_label_\"],\n[class*=\"stage-selector_count_\"],\n[class*=\"color-button_color-button-arrow_\"],\n[class*=\"dropdown_dropdown_\"][class*=\"font-dropdown_font-dropdown_\"],\n[class*=\"sound-editor_tool-button_\"],\n[class*=\"sound-editor_effect-button_\"],\n[class*=\"library-item_featured-extension-metadata_\"],\n[class*=\"record-modal_help-text_\"],\n.sa-editor-modal-content p {\n  color: var(--editorDarkMode-accent-text);\n}\n.blocklyFlyoutButton:hover {\n  fill: var(--editorDarkMode-accent);\n}\n.blocklyFlyoutButton:hover .blocklyText {\n  fill: var(--editorDarkMode-accent-text);\n}\n[class*=\"selector_new-buttons_\"]::before {\n  background: linear-gradient(var(--editorDarkMode-accent-opacity0), var(--editorDarkMode-accent));\n}\n.sa-float-bar-dropdown > li.sa-boolean::before /* middle-click-popup style */ {\n  border-top: 9px solid var(--editorDarkMode-accent);\n  border-bottom: 10px solid var(--editorDarkMode-accent);\n}\n.sa-float-bar-dropdown > li.sa-boolean::after  /* middle-click-popup style */ {\n  border-top: 9px solid var(--editorDarkMode-accent);\n  border-bottom: 10px solid var(--editorDarkMode-accent);\n}\n.sa-body-editor [class*=\"stage-header_stage-button_\"] [class*=\"stage-header_stage-button-icon_\"],\n[class*=\"sprite-info_icon-wrapper_\"],\nimg[class*=\"tool-select-base_tool-select-icon_\"],\n[class*=\"paint-editor_button-group-button-icon_\"],\n[class*=\"mode-tools_mode-tools-icon_\"],\n[class*=\"library-item_library-item-image_\"][src*=\"static/assets\"] /* sound icon */,\n[class*=\"library-item_featured-extension-metadata-detail_\"] img {\n  filter: var(--editorDarkMode-accent-filter);\n}\n[class*=\"toggle-buttons_button_\"] > img {\n  filter: var(--editorDarkMode-accent-desaturateFilter);\n}\n[class*=\"font-dropdown_font-dropdown_\"][class*=\"dropdown_mod-open_\"] {\n  color: var(--editorDarkMode-accent-openFontDropdownText);\n}\n\n/* Input background */\n.u-dropdown-searchbar:hover,\n[class*=\"project-title-input_title-field_\"]:hover {\n  background-color: var(--editorDarkMode-input-transparent50);\n}\n[class*=\"language-selector_language-select_\"] option,\n[class*=\"project-title-input_title-field_\"]:focus,\n[class*=\"input_input-form_\"],\n[class*=\"input_input-form_\"],\n[class*=\"context-menu_context-menu_\"],\n.blocklyWidgetDiv .goog-menu,\n[class*=\"filter_filter_\"],\n[class*=\"prompt_button-row_\"] button,\n[class*=\"prompt_variable-name-text-input_\"],\n[class*=\"custom-procedures_option-card_\"],\n[class*=\"custom-procedures_button-row_\"] button,\n[class*=\"slider-prompt_button-row_\"] button,\n[class*=\"slider-prompt_min-input_\"],\n[class*=\"slider-prompt_max-input_\"],\n[class*=\"record-modal_button-row_\"] button,\n.Popover-body,\n.sa-onion-settings,\n.sa-paint-snap-settings,\n.u-dropdown-searchbar:focus {\n  background-color: var(--editorDarkMode-input);\n  color: var(--editorDarkMode-input-text);\n  color-scheme: var(--editorDarkMode-input-colorScheme);\n}\n.u-dropdown-searchbar,\n[class*=\"project-title-input_title-field_\"] {\n  background-color: var(--editorDarkMode-input-transparent25);\n}\n[class*=\"color-picker_row-header_\"],\n[class*=\"filter_filter-input_\"],\n[class*=\"filter_filter-input_\"]::placeholder,\n.blocklyWidgetDiv .goog-menuitem,\n.scratchColourPickerLabel {\n  color: var(--editorDarkMode-input-text);\n}\n.Popover-tipShape,\n.sa-onion-settings-polygon,\n.sa-paint-snap-settings-polygon,\n.blocklyFlyoutCheckbox {\n  fill: var(--editorDarkMode-input);\n}\n.blocklyBlockCanvas g:not(.checked) .blocklyFlyoutCheckboxPath {\n  stroke: var(--editorDarkMode-input);\n}\n.blocklyDropDownDiv[style*=\"background-color: rgb(255, 255, 255)\"] {\n  /* scratch-blocks color pickers and result bubbles */\n  background-color: var(--editorDarkMode-input) !important;\n  color: var(--editorDarkMode-input-text);\n}\n.scratchEyedropper img,\n.sa-paint-snap-settings .sa-paint-snap-image,\n.sa-onion-settings .sa-onion-image {\n  filter: var(--editorDarkMode-input-filter);\n}\n.blocklyZoom > image {\n  filter: var(--editorDarkMode-workspace-codeZoomFilter);\n}\n[class*=\"input_input-form_\"]::placeholder,\n[class*=\"input_input-form_\"]::placeholder {\n  color: var(--editorDarkMode-input-transparentText);\n}\n.blocklyWidgetDiv .goog-menuitem-disabled .goog-menuitem-content {\n  color: var(--editorDarkMode-input-transparentText) !important;\n}\n.blocklyDropDownDiv .goog-slider-horizontal .goog-slider-thumb,\n[class*=\"slider_handle_\"] {\n  box-shadow: 0 0 0 4px var(--editorDarkMode-input-foregroundShadow);\n}\n[class*=\"question_question-input_\"] [class*=\"input_input-form_\"] {\n  /* Don't affect ask prompt */\n  background-color: white;\n  border-color: rgba(0, 0, 0, 0.15);\n  color: #575e75;\n}\n\n/* Workspace background */\n.blocklySvg {\n  background-color: var(--editorDarkMode-workspace);\n}\n[id^=\"blocklyGridPattern\"] line {\n  stroke: var(--editorDarkMode-workspace-dots);\n}\n.blocklyMainWorkspaceScrollbar .blocklyScrollbarHandle,\n.blocklyMainWorkspaceScrollbar .blocklyScrollbarBackground:hover + .blocklyScrollbarHandle,\n.blocklyMainWorkspaceScrollbar .blocklyScrollbarHandle:hover {\n  fill: var(--editorDarkMode-workspace-scrollbar);\n}\n.blocklyInsertionMarker > .blocklyPath {\n  fill: var(--editorDarkMode-workspace-insertionMarker);\n}\n\n/* Block category menu background */\n.blocklyToolboxDiv,\n.scratchCategoryMenu {\n  background: var(--editorDarkMode-categoryMenu);\n  color: var(--editorDarkMode-categoryMenu-text);\n}\n.scratchCategoryMenuItem.categorySelected {\n  background-color: var(--editorDarkMode-categoryMenu-selection);\n  color: var(--editorDarkMode-categoryMenu-text);\n}\n.scratchCategoryMenuItem:hover {\n  color: var(--editorDarkMode-categoryMenu-hoverText) !important;\n}\n\n/* Block palette background */\n.blocklyFlyoutBackground {\n  fill: var(--editorDarkMode-palette);\n  fill-opacity: 1;\n}\n.blocklyFlyoutLabelText,\n.blocklyFlyoutButton .blocklyText {\n  fill: var(--editorDarkMode-palette-text);\n}\n.blocklyFlyoutScrollbar .blocklyScrollbarHandle,\n.blocklyFlyoutScrollbar .blocklyScrollbarBackground:hover + .blocklyScrollbarHandle,\n.blocklyFlyoutScrollbar .blocklyScrollbarHandle:hover {\n  fill: var(--editorDarkMode-palette-scrollbar);\n}\n\n/* Full screen background */\n[class*=\"stage-wrapper_stage-wrapper_\"][class*=\"stage-wrapper_full-screen_\"] {\n  background-color: var(--editorDarkMode-fullscreen);\n}\n\n/* Full screen stage header background */\n[class*=\"stage-header_stage-header-wrapper-overlay_\"] {\n  background-color: var(--editorDarkMode-stageHeader);\n}\n\n/* Primary color */\n[class*=\"sprite-selector-item_is-selected_\"] [class*=\"sprite-selector-item_sprite-info_\"],\n[class*=\"delete-button_delete-button-visible_\"],\n[class*=\"stage-selector_stage-selector_\"][class*=\"stage-selector_is-selected_\"] [class*=\"stage-selector_header_\"],\n[class*=\"font-dropdown_mod-menu-item_\"]:hover:not(:active),\n[class*=\"tool-select-base_mod-tool-select_\"][class*=\"tool-select-base_is-selected_\"],\n[class*=\"tool-select-base_mod-tool-select_\"][class*=\"tool-select-base_is-selected_\"]:active,\n[class*=\"paint-editor_bitmap-button_\"],\n.sa-onion-button[data-enabled=\"true\"],\n.sa-paint-snap-button[data-enabled=\"true\"],\n[class*=\"sound-editor_round-button_\"],\n[class*=\"audio-trimmer_selection-background_\"],\n[class*=\"tag-button_tag-button_\"]:not([class*=\"tag-button_active_\"]),\n[class*=\"action-menu_button_\"],\n[class*=\"context-menu_menu-item_\"]:not([class*=\"context-menu_menu-item-danger_\"]):hover,\n.blocklyWidgetDiv .goog-menuitem-highlight,\n.blocklyWidgetDiv .goog-menuitem-hover {\n  background-color: var(--editorDarkMode-primary);\n  color: var(--editorDarkMode-primary-text);\n}\n[class*=\"gui_extension-button-container_\"],\n[class*=\"prompt_button-row_\"] button[class*=\"prompt_ok-button_\"],\n[class*=\"custom-procedures_button-row_\"] button[class*=\"custom-procedures_ok-button_\"],\n[class*=\"record-modal_button-row_\"] button[class*=\"record-modal_ok-button_\"] {\n  background-color: var(--editorDarkMode-primary);\n  border-color: var(--editorDarkMode-primary);\n}\n[class*=\"input_input-form_\"]:not([class*=\"project-title-input_title-field_\"]):hover,\n[class*=\"toggle-buttons_button_\"]:focus::before,\n[class*=\"stage_frame_\"],\n[class*=\"sprite-selector-item_sprite-selector-item_\"]:hover,\n[class*=\"stage-selector_stage-selector_\"]:hover,\n[class*=\"sound-editor_button_\"]:focus::before,\n[class*=\"library-item_library-item_\"]:hover {\n  border-color: var(--editorDarkMode-primary);\n}\n[class*=\"green-flag_green-flag_\"]:hover,\n[class*=\"stop-all_stop-all_\"]:hover,\n.pause-btn:hover,\n[class*=\"toggle-buttons_button_\"][aria-pressed=\"true\"],\n[class*=\"icon-button_container_\"]:not([class*=\"tool-select-base_is-selected_\"]):active,\n[class*=\"record-modal_waveform-container_\"] {\n  background-color: var(--editorDarkMode-primary-transparent15);\n}\n[class*=\"library_filter-bar_\"],\n.sa-body-editor [class*=\"stage-header_stage-button_\"]:active,\n[class*=\"stage_frame_\"],\n[class*=\"toggle-buttons_button_\"]:active,\n[class*=\"button_button_\"]:active,\n[class*=\"fixed-tools_mod-menu-item_\"]:not([class*=\"fixed-tools_mod-disabled_\"]):hover,\n[class*=\"button_highlighted_\"][class*=\"button_button_\"],\n.sa-paint-snap-button:active,\n.sa-onion-button:active,\n[class*=\"sound-editor_button_\"]:active {\n  background-color: var(--editorDarkMode-primary-transparent35);\n}\n[class*=\"button_mod-disabled_\"]:active {\n  background-color: transparent;\n}\n[class*=\"modal_modal-overlay_\"] {\n  background-color: var(--editorDarkMode-popup);\n}\n[class*=\"delete-button_delete-button-visible_\"],\n[class*=\"filter_filter_\"]:focus-within {\n  box-shadow: 0 0 0 2px var(--editorDarkMode-primary-transparent35);\n}\n[class*=\"color-picker_active-swatch_\"],\n[class*=\"question_question-input_\"] > input:focus {\n  border-color: var(--editorDarkMode-primary);\n  box-shadow: 0 0 0 3px var(--editorDarkMode-primary-transparent35);\n}\n[class*=\"action-menu_main-button_\"] {\n  box-shadow: 0 0 0 4px var(--editorDarkMode-primary-transparent35);\n}\n[class*=\"input_input-form_\"]:not([class*=\"project-title-input_title-field_\"]):not(\n    .sa-find-input,\n    .sa-float-bar-input\n  ):focus,\n[class*=\"input_input-form_\"]:focus,\n[class*=\"sprite-selector-item_sprite-selector-item_\"][class*=\"sprite-selector-item_is-selected_\"],\n[class*=\"stage-selector_stage-selector_\"][class*=\"stage-selector_is-selected_\"],\n[class*=\"custom-procedures_option-card_\"]:hover {\n  border-color: var(--editorDarkMode-primary);\n  box-shadow: 0 0 0 4px var(--editorDarkMode-primary-transparent35);\n}\n[class*=\"action-menu_main-button_\"]:hover {\n  box-shadow: 0 0 0 6px var(--editorDarkMode-primary-transparent35);\n}\n[class*=\"stage-selector_stage-selector_\"][class*=\"stage-selector_is-selected_\"] [class*=\"stage-selector_header-title_\"],\n[class*=\"prompt_button-row_\"] button[class*=\"prompt_ok-button_\"],\n[class*=\"record-modal_button-row_\"] button[class*=\"record-modal_ok-button_\"] {\n  color: var(--editorDarkMode-primary-text);\n}\n[class*=\"gui_extension-button-icon_\"],\n[class*=\"delete-button_delete-icon_\"],\n[class*=\"action-menu_main-button_\"]:not(:hover) [class*=\"action-menu_main-icon_\"],\n[class*=\"action-menu_more-button_\"]:not(:hover) [class*=\"action-menu_more-icon_\"],\n[class*=\"paint-editor_bitmap-button-icon_\"] {\n  filter: var(--editorDarkMode-primary-filter);\n}\n[class*=\"tool-select-base_mod-tool-select_\"][class*=\"tool-select-base_is-selected_\"]\n  [class*=\"tool-select-base_tool-select-icon_\"],\n.sa-paint-snap-button[data-enabled=\"true\"] .sa-paint-snap-image,\n.sa-onion-button[data-enabled=\"true\"] .sa-onion-image {\n  filter: var(--editorDarkMode-primary-filter2);\n}\n[class*=\"action-menu_more-buttons-outer_\"],\n[class*=\"action-menu_more-button_\"] {\n  background-color: var(--editorDarkMode-primary-variant);\n}\n[class*=\"audio-trimmer_selector_\"] [class*=\"audio-trimmer_trim-line_\"] {\n  border-color: var(--editorDarkMode-primary-variant);\n}\n/* Don't affect ask prompt: */\n[class*=\"question_question-input_\"] [class*=\"input_input-form_\"]:hover,\n[class*=\"question_question-container_\"] /* <-- specificity */ [class*=\"question_question-input_\"] [class*=\"input_input-form_\"]:focus {\n  border-color: #855cd6;\n}\n[class*=\"question_question-container_\"] /* <-- specificity */ [class*=\"question_question-input_\"] [class*=\"input_input-form_\"]:focus {\n  box-shadow: 0 0 0 4px rgba(133, 92, 214, 0.35);\n}\n\n/* Text and icon highlight color */\n.sa-body-editor a:link,\n[class*=\"gui_tab_\"][class*=\"gui_is-selected_\"],\n[class*=\"dropdown_dropdown_\"],\n[class*=\"record-modal_playing-text_\"],\n[class*=\"record-modal_button-row_\"] button,\n.sa-debugger-tabs li.sa-debugger-tab-selected {\n  color: var(--editorDarkMode-highlightText);\n}\n[class*=\"gui_tab_\"][class*=\"gui_is-selected_\"] img,\n[class*=\"toggle-buttons_button_\"][aria-pressed=\"true\"] > img,\n[class*=\"sprite-info_is-active_\"] [class*=\"sprite-info_icon_\"],\n[class*=\"fixed-tools_button-group-button-icon_\"],\n[class*=\"color-picker_swap-button_\"] [class*=\"labeled-icon-button_edit-field-icon_\"],\n[class*=\"dropdown_dropdown-icon_\"],\n[class*=\"sound-editor_undo-icon_\"],\n[class*=\"sound-editor_redo-icon_\"],\n[class*=\"sound-editor_tool-button_\"] img,\n[class*=\"audio-trimmer_trim-handle_\"] img,\n[class*=\"filter_filter-icon_\"],\nimg[src=\"/static/assets/7911235b3ccae7b7452ba3da6b5e9c7f.svg\"] /* record modal play */,\nimg[src*=\"c3RvcC1wbGF5YmFjayI+CiAgICAgICAgICAgICAgICAgICAgICAgIDx1c2UgZmlsbD0iYmxhY2siIGZpbGwtb3BhY2l0eT0iMSIgZmlsdGVyPSJ1cmwoI2ZpbHRlci0yKSIgeGxpbms6aHJlZj0iI3BhdGgtMSI+PC91c2U+CiAgICAgICAgICAgICAgICAgICAgICAgIDx1c2UgZmlsbD0iIzg1NUNENiIg\"] /* record modal stop */,\n[class*=\"record-modal_rerecord-button_\"] img,\n.sa-debugger-tabs li.sa-debugger-tab-selected img {\n  filter: var(--editorDarkMode-highlightText-iconFilter);\n}\n\n/* Border color */\n[class*=\"gui_tab_\"],\n[class*=\"gui_tab_\"][class*=\"gui_is-selected_\"]:focus,\n[class*=\"blocks_blocks_\"] .injectionDiv,\n[class*=\"blocks_blocks_\"] .blocklyToolboxDiv,\n[dir=\"rtl\"] [class*=\"blocks_blocks_\"] .blocklyToolboxDiv,\n[class*=\"blocks_blocks_\"] .blocklyFlyout,\n[dir=\"rtl\"] [class*=\"blocks_blocks_\"] .blocklyFlyout,\n[class*=\"backpack_backpack-header_\"],\n[class*=\"backpack_backpack-list_\"],\n.sa-body-editor [class*=\"stage_stage_\"],\n.sa-body-editor [class*=\"stage-header_stage-button_\"],\n[class*=\"toggle-buttons_button_\"],\n[dir=\"rtl\"] [class*=\"toggle-buttons_button_\"]:not(:last-child),\n[class*=\"sprite-selector_sprite-selector_\"],\n[class*=\"input_input-form_\"],\n[class*=\"input_input-form_\"],\n[class*=\"sprite-info_sprite-info_\"],\n[class*=\"sprite-selector-item_sprite-selector-item_\"],\n[class*=\"stage-selector_stage-selector_\"],\n[class*=\"stage-selector_header_\"],\n[class*=\"stage-selector_costume-canvas_\"],\n[class*=\"asset-panel_wrapper_\"],\n[dir=\"ltr\"] [class*=\"asset-panel_detail-area_\"],\n[dir=\"rtl\"] [class*=\"asset-panel_detail-area_\"],\n[class*=\"fixed-tools_button-group-button_\"],\n[dir=\"ltr\"] [class*=\"fixed-tools_button-group-button_\"]:first-of-type,\n[dir=\"rtl\"] [class*=\"fixed-tools_button-group-button_\"]:first-of-type,\n[dir=\"ltr\"] [class*=\"fixed-tools_button-group-button_\"][class*=\"fixed-tools_mod-start-border_\"],\n[dir=\"rtl\"] [class*=\"fixed-tools_button-group-button_\"][class*=\"fixed-tools_mod-start-border_\"],\n[class*=\"color-button_color-button-swatch_\"],\n[class*=\"color-button_outline-swatch_\"]::after,\n[class*=\"color-button_color-button-arrow_\"],\n[class*=\"color-picker_divider_\"],\n[class*=\"color-picker_swatch_\"],\n[dir=\"ltr\"] [class*=\"fixed-tools_mod-dashed-border_\"],\n[dir=\"rtl\"] [class*=\"fixed-tools_mod-dashed-border_\"],\n[dir=\"ltr\"] [class*=\"paint-editor_mod-dashed-border_\"],\n[dir=\"rtl\"] [class*=\"paint-editor_mod-dashed-border_\"],\n[dir=\"ltr\"] [class*=\"mode-tools_mod-dashed-border_\"],\n[dir=\"rtl\"] [class*=\"mode-tools_mod-dashed-border_\"],\n[class*=\"dropdown_dropdown_\"],\n[class*=\"paint-editor_editor-container-top_\"],\n[class*=\"paint-editor_canvas-container_\"],\n[class*=\"paint-editor_button-group-button_\"],\n[dir=\"ltr\"] [class*=\"paint-editor_button-group-button_\"]:first-of-type,\n[dir=\"rtl\"] [class*=\"paint-editor_button-group-button_\"]:first-of-type,\n[class*=\"sound-editor_button_\"],\n[dir=\"ltr\"] [class*=\"sound-editor_button-group_\"] [class*=\"sound-editor_button_\"]:first-of-type,\n[dir=\"rtl\"] [class*=\"sound-editor_button-group_\"] [class*=\"sound-editor_button_\"]:first-of-type,\n[dir=\"ltr\"] [class*=\"sound-editor_input-group_\"],\n[dir=\"rtl\"] [class*=\"sound-editor_input-group_\"],\n[dir=\"rtl\"] [class*=\"sound-editor_row-reverse_\"] > [class*=\"sound-editor_input-group_\"],\n.sa-var-manager td,\n[class*=\"context-menu_context-menu_\"],\n[class*=\"context-menu_menu-item-bordered_\"],\n.blocklyWidgetDiv .goog-menu,\n.scratchEyedropper,\n.Popover-body,\n.sa-onion-settings,\n.sa-paint-snap-settings,\n[class*=\"prompt_variable-name-text-input_\"],\n[class*=\"prompt_cloud-option_\"],\n[class*=\"prompt_button-row_\"] button,\n[class*=\"custom-procedures_button-row_\"] button,\n[class*=\"slider-prompt_min-input_\"],\n[class*=\"slider-prompt_max-input_\"],\n[class*=\"slider-prompt_button-row_\"] button,\n[class*=\"record-modal_waveform-container_\"],\n[class*=\"record-modal_button-row_\"] button,\n.sa-debugger-log {\n  border-color: var(--editorDarkMode-border);\n}\n.blocklyWidgetDiv .goog-menuitem,\n.blocklyDropDownDiv[style*=\"background-color: rgb(255, 255, 255)\"] {\n  border-color: var(--editorDarkMode-border) !important;\n}\n.blocklyFlyoutButtonBackground,\n[class*=\"custom-procedures_workspace_\"] .blocklyMainBackground,\n.blocklyFlyoutCheckbox,\n.Popover-tipShape,\n.sa-paint-snap-settings-polygon,\n.sa-onion-settings-polygon {\n  stroke: var(--editorDarkMode-border);\n}\n[class*=\"dropdown_mod-open_\"] {\n  background-color: var(--editorDarkMode-border);\n  border-color: transparent;\n}\n\n/* Miscellaneous styles */\n[class*=\"stage-wrapper_\"],\n[class*=\"paint-editor_canvas-container_\"] {\n  color: #575e75;\n}\n[class*=\"sprite-selector_sprite-selector_\"] {\n  /* Remove weird border if accent background\n  and sprite list background are too different. */\n  background-clip: padding-box;\n}\n[class*=\"backpack_backpack-item_\"] img {\n  /* Make backpack items have a white background,\n  otherwise they would be too dark in dark mode. */\n  mix-blend-mode: normal;\n}\n.blocklyWidgetDiv .goog-menuitem-highlight {\n  border-color: transparent !important;\n}\n\n.sa-opacity-slider {\n  background-image: linear-gradient(\n      45deg,\n      var(--editorDarkMode-accent-paintEditorBackground) 25%,\n      transparent 25%,\n      transparent 75%,\n      var(--editorDarkMode-accent-paintEditorBackground) 75%\n    ),\n    linear-gradient(\n      45deg,\n      var(--editorDarkMode-accent-paintEditorBackground) 25%,\n      transparent 25%,\n      transparent 75%,\n      var(--editorDarkMode-accent-paintEditorBackground) 75%\n    );\n}\n.Popover .resize-sensor {\n  /* The <object> gets a white background if color-scheme is dark. */\n  color-scheme: light;\n}\n/* For `editor-comment-previews` */\n.sa-comment-preview-inner {\n  color: var(--editorDarkMode-input-text);\n  background-color: var(--editorDarkMode-input-transparent90);\n}\n@supports (backdrop-filter: blur(16px)) {\n  .sa-comment-preview-inner {\n    background-color: var(--editorDarkMode-input-transparent75);\n    backdrop-filter: blur(16px);\n  }\n}\n.sa-comment-preview-reduce-transparency {\n  background-color: var(--editorDarkMode-input);\n}\n\n/*# sourceURL=experimental_editor.css */",
                    "index": 0
                },
                {
                    "href": "../../addons/editor-dark-mode/paper.css",
                    "text": "[class*=\"paint-editor_canvas-container_\"] {\n  color: var(--editorDarkMode-accent-text);\n}\n\n[class*=\"paper-canvas_paper-canvas_\"] {\n  background-color: var(--editorDarkMode-accent-paintEditorBackground);\n}\n\n[class*=\"scrollable-canvas_vertical-scrollbar_\"],\n[class*=\"scrollable-canvas_horizontal-scrollbar_\"] {\n  background-color: var(--editorDarkMode-accent-paintEditorScrollbar);\n}\n\n/*# sourceURL=paper.css */",
                    "index": 2
                }
            ],
            "cssVariables": [
                {
                    "name": "page-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-transparentText",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(87, 94, 117, 0.75)",
                        "white": "rgba(255, 255, 255, 0.75)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-tabHoverFilter",
                    "value": {
                        "type": "textColor",
                        "black": "grayscale(100%)",
                        "white": "brightness(0) invert(1) opacity(0.75)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "page-compactScrollbar",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        },
                        "black": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "page"
                            },
                            "r": 0.83,
                            "g": 0.83,
                            "b": 0.83,
                            "a": 1
                        },
                        "white": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "page"
                            },
                            "r": 0.87,
                            "g": 0.87,
                            "b": 0.87,
                            "a": 1
                        },
                        "threshold": 110
                    }
                },
                {
                    "name": "page-loader",
                    "value": {
                        "type": "textColor",
                        "black": "#4d97ff",
                        "white": {
                            "type": "settingValue",
                            "settingId": "page"
                        },
                        "source": {
                            "type": "settingValue",
                            "settingId": "page"
                        }
                    }
                },
                {
                    "name": "primary-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "primary"
                        }
                    }
                },
                {
                    "name": "primary-filter",
                    "value": {
                        "type": "textColor",
                        "black": "brightness(0.4)",
                        "white": "none",
                        "source": {
                            "type": "settingValue",
                            "settingId": "primary"
                        }
                    }
                },
                {
                    "name": "primary-filter2",
                    "value": {
                        "type": "textColor",
                        "black": "none",
                        "white": "brightness(0) invert(1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "primary"
                        }
                    }
                },
                {
                    "name": "primary-transparent35",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "primary"
                        },
                        "a": 0.35,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "primary-transparent15",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "primary"
                        },
                        "a": 0.15,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "primary-variant",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "primary"
                        },
                        "black": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "primary"
                            },
                            "r": 0.85,
                            "g": 0.85,
                            "b": 0.85,
                            "a": 1
                        },
                        "white": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "primary"
                            },
                            "r": 0.75,
                            "g": 0.75,
                            "b": 0.75,
                            "a": 1
                        },
                        "threshold": 60
                    }
                },
                {
                    "name": "highlightText-iconFilter",
                    "value": {
                        "type": "recolorFilter",
                        "source": {
                            "type": "settingValue",
                            "settingId": "highlightText"
                        }
                    }
                },
                {
                    "name": "menuBar-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "menuBar"
                        }
                    }
                },
                {
                    "name": "menuBar-transparentText",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(87, 94, 117, 0.25)",
                        "white": "rgba(255, 255, 255, 0.25)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "menuBar"
                        }
                    }
                },
                {
                    "name": "menuBar-dimText",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(87, 94, 117, 0.75)",
                        "white": "rgba(255, 255, 255, 0.75)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "menuBar"
                        }
                    }
                },
                {
                    "name": "menuBar-filter",
                    "value": {
                        "type": "textColor",
                        "black": "brightness(0.4)",
                        "white": "none",
                        "source": {
                            "type": "settingValue",
                            "settingId": "menuBar"
                        }
                    }
                },
                {
                    "name": "menuBar-border",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.15)",
                        "white": "rgba(255, 255, 255, 0.15)",
                        "threshold": 60,
                        "source": {
                            "type": "settingValue",
                            "settingId": "menuBar"
                        }
                    }
                },
                {
                    "name": "tab-text",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(87, 94, 117, 0.75)",
                        "white": "rgba(255, 255, 255, 0.75)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "tab"
                        }
                    }
                },
                {
                    "name": "tab-filter",
                    "value": {
                        "type": "textColor",
                        "black": "grayscale(100%)",
                        "white": "brightness(0) invert(1) opacity(0.75)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "tab"
                        }
                    }
                },
                {
                    "name": "selector-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "selector"
                        }
                    }
                },
                {
                    "name": "selector-colorScheme",
                    "value": {
                        "type": "textColor",
                        "black": "light",
                        "white": "dark",
                        "source": {
                            "type": "settingValue",
                            "settingId": "selector"
                        },
                        "threshold": 128
                    }
                },
                {
                    "name": "selector-compactScrollbar",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "selector"
                        },
                        "black": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "selector"
                            },
                            "r": 0.83,
                            "g": 0.83,
                            "b": 0.83,
                            "a": 1
                        },
                        "white": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "selector"
                            },
                            "r": 0.87,
                            "g": 0.87,
                            "b": 0.87,
                            "a": 1
                        },
                        "threshold": 110
                    }
                },
                {
                    "name": "selector2-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "selector2"
                        }
                    }
                },
                {
                    "name": "selector2-filter",
                    "value": {
                        "type": "textColor",
                        "black": "none",
                        "white": "brightness(0) invert(1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "selector2"
                        }
                    }
                },
                {
                    "name": "selector2-colorScheme",
                    "value": {
                        "type": "textColor",
                        "black": "light",
                        "white": "dark",
                        "source": {
                            "type": "settingValue",
                            "settingId": "selector2"
                        },
                        "threshold": 128
                    }
                },
                {
                    "name": "selector2-compactScrollbar",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "selector2"
                        },
                        "black": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "selector2"
                            },
                            "r": 0.83,
                            "g": 0.83,
                            "b": 0.83,
                            "a": 1
                        },
                        "white": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "selector2"
                            },
                            "r": 0.87,
                            "g": 0.87,
                            "b": 0.87,
                            "a": 1
                        },
                        "threshold": 110
                    }
                },
                {
                    "name": "selectorSelection-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "selectorSelection"
                        }
                    }
                },
                {
                    "name": "selectorSelection-filter",
                    "value": {
                        "type": "textColor",
                        "black": "drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.15)",
                        "white": "brightness(0) invert(1) drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.15)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "selectorSelection"
                        }
                    }
                },
                {
                    "name": "accent-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "accent"
                        }
                    }
                },
                {
                    "name": "accent-openFontDropdownText",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "alphaBlend",
                            "opaqueSource": {
                                "type": "settingValue",
                                "settingId": "accent"
                            },
                            "transparentSource": {
                                "type": "settingValue",
                                "settingId": "border"
                            }
                        }
                    }
                },
                {
                    "name": "accent-filter",
                    "value": {
                        "type": "textColor",
                        "black": "none",
                        "white": "brightness(0) invert(1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "accent"
                        }
                    }
                },
                {
                    "name": "accent-desaturateFilter",
                    "value": {
                        "type": "textColor",
                        "black": "grayscale(100%) opacity(0.5)",
                        "white": "brightness(0) invert(1) opacity(0.3)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "accent"
                        }
                    }
                },
                {
                    "name": "accent-invertedFilter",
                    "value": {
                        "type": "textColor",
                        "black": "brightness(0.4)",
                        "white": "none",
                        "source": {
                            "type": "settingValue",
                            "settingId": "accent"
                        }
                    }
                },
                {
                    "name": "accent-colorScheme",
                    "value": {
                        "type": "textColor",
                        "black": "light",
                        "white": "dark",
                        "source": {
                            "type": "settingValue",
                            "settingId": "accent"
                        },
                        "threshold": 128
                    }
                },
                {
                    "name": "accent-opacity0",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "accent"
                        },
                        "a": 0,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "accent-paintEditorBackground",
                    "value": {
                        "type": "alphaBlend",
                        "opaqueSource": {
                            "type": "settingValue",
                            "settingId": "accent"
                        },
                        "transparentSource": {
                            "type": "multiply",
                            "source": {
                                "type": "textColor",
                                "black": {
                                    "type": "makeHsv",
                                    "h": {
                                        "type": "settingValue",
                                        "settingId": "page"
                                    },
                                    "s": 1,
                                    "v": 0.67
                                },
                                "white": {
                                    "type": "makeHsv",
                                    "h": {
                                        "type": "settingValue",
                                        "settingId": "page"
                                    },
                                    "s": 0.5,
                                    "v": 1
                                },
                                "threshold": 112,
                                "source": {
                                    "type": "settingValue",
                                    "settingId": "accent"
                                }
                            },
                            "a": 0.15,
                            "r": 1,
                            "g": 1,
                            "b": 1
                        }
                    }
                },
                {
                    "name": "accent-paintEditorScrollbar",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "accent"
                        },
                        "black": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "accent"
                            },
                            "r": 0.75,
                            "g": 0.75,
                            "b": 0.75,
                            "a": 0.8
                        },
                        "white": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "accent"
                            },
                            "r": 0.8,
                            "g": 0.8,
                            "b": 0.8,
                            "a": 0.8
                        },
                        "threshold": 110
                    }
                },
                {
                    "name": "input-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "input"
                        }
                    }
                },
                {
                    "name": "input-transparentText",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(87, 94, 117, 0.6)",
                        "white": "rgba(255, 255, 255, 0.4)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "input"
                        }
                    }
                },
                {
                    "name": "input-filter",
                    "value": {
                        "type": "textColor",
                        "black": "none",
                        "white": "brightness(0) invert(1)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "input"
                        }
                    }
                },
                {
                    "name": "input-foregroundShadow",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.15)",
                        "white": "rgba(255, 255, 255, 0.15)",
                        "threshold": 60,
                        "source": {
                            "type": "settingValue",
                            "settingId": "input"
                        }
                    }
                },
                {
                    "name": "input-colorScheme",
                    "value": {
                        "type": "textColor",
                        "black": "light",
                        "white": "dark",
                        "source": {
                            "type": "settingValue",
                            "settingId": "input"
                        },
                        "threshold": 128
                    }
                },
                {
                    "name": "input-transparent90",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "input"
                        },
                        "a": 0.9,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "input-transparent75",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "input"
                        },
                        "a": 0.75,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "input-transparent50",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "input"
                        },
                        "a": 0.5,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "input-transparent25",
                    "value": {
                        "type": "multiply",
                        "source": {
                            "type": "settingValue",
                            "settingId": "input"
                        },
                        "a": 0.25,
                        "r": 1,
                        "g": 1,
                        "b": 1
                    }
                },
                {
                    "name": "workspace-codeZoomFilter",
                    "value": {
                        "type": "textColor",
                        "black": "none",
                        "white": "invert(1) hue-rotate(180deg)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "workspace"
                        }
                    }
                },
                {
                    "name": "workspace-scrollbar",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "workspace"
                        },
                        "black": {
                            "type": "multiply",
                            "source": {
                                "type": "settingValue",
                                "settingId": "workspace"
                            },
                            "r": 0.83,
                            "g": 0.83,
                            "b": 0.83,
                            "a": 1
                        },
                        "white": {
                            "type": "brighten",
                            "source": {
                                "type": "settingValue",
                                "settingId": "workspace"
                            },
                            "r": 0.87,
                            "g": 0.87,
                            "b": 0.87,
                            "a": 1
                        },
                        "threshold": 110
                    }
                },
                {
                    "name": "workspace-dots",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(0, 0, 0, 0.13)",
                        "white": "rgba(255, 255, 255, 0.13)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "workspace"
                        }
                    }
                },
                {
                    "name": "workspace-insertionMarker",
                    "value": {
                        "type": "textColor",
                        "black": "#000000",
                        "source": {
                            "type": "settingValue",
                            "settingId": "workspace"
                        }
                    }
                },
                {
                    "name": "categoryMenu-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "settingValue",
                            "settingId": "categoryMenu"
                        }
                    }
                },
                {
                    "name": "categoryMenu-invertedFilter",
                    "value": {
                        "type": "textColor",
                        "black": "brightness(0.4)",
                        "white": "none",
                        "source": {
                            "type": "settingValue",
                            "settingId": "categoryMenu"
                        }
                    }
                },
                {
                    "name": "categoryMenu-selection",
                    "value": {
                        "type": "textColor",
                        "black": "rgba(87, 124, 155, 0.13)",
                        "white": "rgba(255, 255, 255, 0.05)",
                        "source": {
                            "type": "settingValue",
                            "settingId": "categoryMenu"
                        }
                    }
                },
                {
                    "name": "categoryMenu-hoverText",
                    "value": {
                        "type": "textColor",
                        "black": "#3373cc",
                        "white": "#80b5ff",
                        "source": {
                            "type": "settingValue",
                            "settingId": "categoryMenu"
                        }
                    }
                },
                {
                    "name": "palette-text",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "alphaBlend",
                            "opaqueSource": {
                                "type": "settingValue",
                                "settingId": "workspace"
                            },
                            "transparentSource": {
                                "type": "settingValue",
                                "settingId": "palette"
                            }
                        }
                    }
                },
                {
                    "name": "palette-filter",
                    "value": {
                        "type": "textColor",
                        "black": "none",
                        "white": "brightness(0) invert(1)",
                        "source": {
                            "type": "alphaBlend",
                            "opaqueSource": {
                                "type": "settingValue",
                                "settingId": "workspace"
                            },
                            "transparentSource": {
                                "type": "settingValue",
                                "settingId": "palette"
                            }
                        }
                    }
                },
                {
                    "name": "palette-scrollbar",
                    "value": {
                        "type": "textColor",
                        "source": {
                            "type": "alphaBlend",
                            "opaqueSource": {
                                "type": "settingValue",
                                "settingId": "workspace"
                            },
                            "transparentSource": {
                                "type": "settingValue",
                                "settingId": "palette"
                            }
                        },
                        "black": {
                            "type": "multiply",
                            "source": {
                                "type": "alphaBlend",
                                "opaqueSource": {
                                    "type": "settingValue",
                                    "settingId": "workspace"
                                },
                                "transparentSource": {
                                    "type": "settingValue",
                                    "settingId": "palette"
                                }
                            },
                            "r": 0.83,
                            "g": 0.83,
                            "b": 0.83,
                            "a": 1
                        },
                        "white": {
                            "type": "brighten",
                            "source": {
                                "type": "alphaBlend",
                                "opaqueSource": {
                                    "type": "settingValue",
                                    "settingId": "workspace"
                                },
                                "transparentSource": {
                                    "type": "settingValue",
                                    "settingId": "palette"
                                }
                            },
                            "r": 0.91,
                            "g": 0.91,
                            "b": 0.91,
                            "a": 1
                        },
                        "threshold": 110
                    }
                }
            ],
            "injectAsStyleElt": true,
            "index": 161
        }
    ]
});
