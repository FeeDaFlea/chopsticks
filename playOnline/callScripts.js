function callScripts(scriptIndex) {
    const scriptElement = document.createElement("script");
    scriptElement.setAttribute("src", scripts[scriptIndex]);
    scriptElement.onload = () => {
        setTimeout(() => {
            if(scripts[scriptIndex + 1]) {
                callScripts(scriptIndex + 1)
            }
        }, 1000);
    };
    scriptElement.onerror = () => {
        console.error(`Error loading script: ${scriptElement.src}`);
    };
    document.head.append(scriptElement);
}

function makeElement(elmName, parent, properties) {
    const elm = document.createElement(elmName);
    Object.keys(properties).forEach(property => {
        elm[property] = properties[property];
    })
    parent.append(elm);
}

const scripts = [ "./parseText.js", "./initialDom.js", "./game.js", "./prompt.js"];

callScripts(0)