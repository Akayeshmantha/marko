'use strict';

var warp10 = require('warp10');
var escapeEndingScriptTagRegExp = /<\//g;

function getRenderedComponents(out, shouldIncludeAll) {
    var componentsContext = out.___components;
    if (componentsContext === null) {
        return;
    }

    // console.log('componentsContext:', componentsContext);

    var components = componentsContext.___components;
    var len;
    if ((len = components.length) === 0) {
        return;
    }

    // console.log('components:', components.map((componentDef) => {
    //     return { id: componentDef.id, type: componentDef.type};
    // }));

    var componentsFinal = [];
    var typesLookup = {};
    var typesArray = [];

    for (var i = len - 1; i >= 0; i--) {
        var componentDef = components[i];
        var id = componentDef.id;
        var component = componentDef.___component;
        var flags = componentDef.___flags;

        var state = component.state;
        var input = component.input;
        var typeName = component.typeName;
        var customEvents = component.___customEvents;
        var scope = component.___scope;
        var bubblingDomEvents = component.___bubblingDomEvents;

        component.___state = undefined; // We don't use `delete` to avoid V8 deoptimization
        component.___input = undefined; // We don't use `delete` to avoid V8 deoptimization
        component.typeName = undefined;
        component.id = undefined;
        component.___customEvents = undefined;
        component.___scope = undefined;
        component.___bubblingDomEvents = undefined;
        component.___bubblingDomEventsExtraArgsCount = undefined;

        if (!typeName) {
            continue;
        }

        var typeIndex = typesLookup[typeName];
        if (typeIndex === undefined) {
            typeIndex = typesArray.length;
            typesArray.push(typeName);
            typesLookup[typeName] = typeIndex;
        }

        var hasProps = false;

        let componentKeys = Object.keys(component);
        for (let i=0, len=componentKeys.length; i<len; i++) {
            let key = componentKeys[i];

            if (component[key] !== undefined) {
                hasProps = true;
                break;
            }
        }

        var undefinedPropNames;

        if (state) {
            // Update state properties with an `undefined` value to have a `null`
            // value so that the property name will be serialized down to the browser.
            // This ensures that we add the proper getter/setter for the state property.

            let stateKeys = Object.keys(state);
            for (let i=0, len=stateKeys.length; i<len; i++) {
                let key = stateKeys[i];

                if (state[key] === undefined) {
                    if (undefinedPropNames) {
                        undefinedPropNames.push(key);
                    } else {
                        undefinedPropNames = [key];
                    }
                }
            }
        }

        var extra = {
            b: bubblingDomEvents,
            d: componentDef.___domEvents,
            e: customEvents,
            f: flags ? flags : undefined,
            p: customEvents && scope, // Only serialize scope if we need to attach custom events
            r: componentDef.___boundary,
            s: state,
            u: undefinedPropNames,
            w: hasProps ? component : undefined
        };

        componentsFinal.push([
            id,                  // 0 = id
            typeIndex,           // 1 = type
            input,               // 2 = input
            extra                // 3
        ]);
    }

    if (componentsFinal.length !== 0) {
        return {w: componentsFinal, t: typesArray};
    }
}

function writeInitComponentsCode(out, shouldIncludeAll) {
    var renderedComponents = getRenderedComponents(out, shouldIncludeAll);
    if (renderedComponents === undefined) {
        return;
    }

    var cspNonce = out.global.cspNonce;
    var nonceAttr = cspNonce ? ' nonce='+JSON.stringify(cspNonce) : '';

    out.write('<script' + nonceAttr + '>' +
        '(function(){var w=window;w.$components=(w.$components||[]).concat(' +
        warp10.stringify(renderedComponents).replace(escapeEndingScriptTagRegExp, '\\u003C/') +
         ')||w.$components})()</script>');
}

exports.writeInitComponentsCode = writeInitComponentsCode;

/**
 * Returns an object that can be sent to the browser using JSON.stringify. The parsed object should be
 * passed to require('marko-components').initComponents(...);
 *
 * @param  {ComponentsContext|AsyncWriter} componentsContext A ComponentsContext or an AsyncWriter
 * @return {Object} An object with information about the rendered components that can be serialized to JSON. The object should be treated as opaque
 */
exports.getRenderedComponents = function(out) {
    var renderedComponents = getRenderedComponents(out, true);
    return warp10.stringifyPrepare(renderedComponents);
};
