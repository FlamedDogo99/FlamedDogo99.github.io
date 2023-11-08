function fixConsole() {
  console.log("FIXED CONSOLE");
  console.trace();
  window._realConsole = {
    ...console,
  };
}

if (!(document.documentElement instanceof SVGElement)) {
  const fixConsoleScript = document.createElement("script");
  fixConsoleScript.append(document.createTextNode("(" + fixConsole + ")()"));
  (document.head || document.documentElement).appendChild(fixConsoleScript);
}
