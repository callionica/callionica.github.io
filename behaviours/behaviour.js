// (c) Callionica 2024

// A behaviour library AKA "web components for attributes"
//
// A behaviour is a class derived from Behaviour.
// A behaviour is attached at most once to an element with a relevant attribute.
// Behaviours are associated with element types and relevant attributes using `registerBehaviour`:
//
// registerBehaviour(MyBehaviour, HTMLElement, ["my-attribute"]);
//
// This code registers the behaviour as being relevant to any class derived from HTMLElement.
//
// The final argument to `registerBehaviour` is an array of attribute names.
// When one or more of the specified attribute names is added to an element derived from the appropriate type,
// a single instance of `MyBehaviour` will be created and its `element` property set to the element.
//
// Behaviours live as long as the element that owns them. Removing the attributes or removing the element from the document
// doesn't remove the behaviour. Behaviours should be written so that attribute changes are taken into account.
// Adding/removing the element from the document does change the behaviour's isConnected
// property and results in calls to `connected` and `disconnected` methods on the behaviour.
//
// (Note that calls to `connected` and `disconnected` are delayed by `MutationObserver` which is what we use to track changes to the document)
//
// In this version of the library, behaviours are enabled on a per-document basis.
// Call `enableBehaviours(document)` to enable behaviour handling for that document.
//
// You can get a behaviour from an element if you know the type of the behavior:
//
// const behaviour = getBehaviour(element, MyBehaviour);
//
// You can get all the relevant behaviours and attributes if you have an element type:
// 
// const behaviourRecord = getBehaviourRecord(HTMLDivElement);
// console.log(Object.entries(behaviourRecord).map(([a,t]) => [a, t.name]));


/**
 * Listens to all changes on the element, attributes, and any descendants
 * or using the options provided. Returns an AbortController unless an AbortSignal is provided
 * in the options.
 * @param { HTMLElement } element 
 * @param { MutationCallback } fn 
 * @param { MutationObserverInit & { signal?: AbortSignal } | undefined } options 
 * @returns { AbortController | undefined }
 */
function listenToElement(element, fn, options = undefined) {
    /** @type AbortController | undefined */
    let controller = undefined;
    if (options?.signal === undefined) {
        controller = new AbortController();
    }

    // @ts-ignore
    const signal = options?.signal ?? controller.signal;

    options = options ?? {
        subtree: true,
        attributes: true,
        characterData: false,
        childList: true
    };

    const m = new MutationObserver(fn);
    m.observe(element, options);

    signal.addEventListener("abort", () => {
        m.disconnect();
    });

    return controller;
}

/** @typedef { string } AttributeName */

/**
 * Base class for attribute behaviours
 */
export class Behaviour {
    /** @type HTMLElement */
    element;

    #connected;

    /** @type boolean */
    get isConnected() {
        return this.#connected ?? false;
    }

    set isConnected(value) {
        if (value !== this.isConnected) {
            this.#connected = value;

            if (value) {
                this.connected();
            } else {
                this.disconnected();
            }
        }
    }

    connected() { }
    disconnected() { }
}

const INSTANCES = Symbol("behaviour-instances");
const REGISTRIES = Symbol("behaviour-registries");

/**
 * Returns the prototype chain
 * @param { object } current 
 */
function* chain(current) {
    while (current !== null) {
        yield current;
        current = Object.getPrototypeOf(current);
    }
}

/**
 * A list of all elements
 * @param { Iterable<Element> } elements 
 */
function* allElements(elements) {
    for (const element of elements) {
        yield element;
        yield* element.querySelectorAll("*");
    }
}

/** @type Map<typeof HTMLElement, Record<AttributeName, typeof Behaviour> > */
const elementTypeToBehaviourRecord = new Map();

/**
 * @param { typeof HTMLElement } elementType 
 */
function getOrCreateBehaviourRecord(elementType) {
    let record = elementTypeToBehaviourRecord.get(elementType);
    if (record === undefined) {
        record = {};
        elementTypeToBehaviourRecord.set(elementType, record);
    }
    return record;
}

/**
 * @param { typeof HTMLElement } elementType 
 * @returns { Record<AttributeName, typeof Behaviour> }
 */
export function getBehaviourRecord(elementType) {
    let value = {};

    for (const link of chain(elementType)) {
        value = { ...elementTypeToBehaviourRecord.get(link), ...value };
    }

    return value;
}

/**
 * @param { typeof Behaviour } behaviourType 
 * @param { typeof HTMLElement } elementType 
 * @param { string[] } attributes 
 */
export function registerBehaviour(behaviourType, elementType, attributes) {
    if (!Array.isArray(attributes)) {
        throw "attributes should be an array";
    }

    const warnings = [];
    const behaviours = getBehaviourRecord(elementType);
    for (const attribute of attributes) {
        const existing = behaviours[attribute];
        if (existing !== undefined) {
            warnings.push({ attribute, behaviourType, existing });
        } else {
            const localBehaviours = getOrCreateBehaviourRecord(elementType);
            localBehaviours[attribute] = behaviourType;
        }
    }
    return { warnings };
}

/**
 * @param { HTMLElement } element 
 * @param { typeof Behaviour } behaviourType 
 */
function connect(element, behaviourType) {
    /** @type Map<typeof Behaviour, Behaviour> */
    const instances = element[INSTANCES] ?? (element[INSTANCES] = new Map());

    const existing = instances.get(behaviourType);
    if (existing !== undefined) {
        existing.isConnected = true;
    } else {
        const instance = new behaviourType();
        instances.set(behaviourType, instance);

        instance.element = element;
        instance.isConnected = true;
    }
}

/**
 * If a behaviour of the specified type is attached to the element, this function will return it.
 * @param { HTMLElement } element 
 * @param { typeof Behaviour } behaviourType 
 * @returns { Behaviour | undefined }
 */
export function getBehaviour(element, behaviourType) {
    const instances = element[INSTANCES] ?? undefined;
    const existing = instances?.get(behaviourType);
    return existing;
}

class BehaviourRegistry {

    /**
     * @param { typeof Behaviour } behaviourType 
     * @param { typeof HTMLElement } elementType 
     * @param { AttributeName[] } attributes 
     */
    register(behaviourType, elementType, attributes) {
        return registerBehaviour(behaviourType, elementType, attributes);
    }

    /**
     * @param { Iterable<HTMLElement> } elements 
     */
    connect(elements) {
        for (const element of elements) {
            const behaviours = getBehaviourRecord(element.constructor);
            if (behaviours !== undefined) {
                const entries = Object.entries(behaviours);
                for (const [attribute, behaviour] of entries) {
                    if (element.hasAttribute(attribute)) {
                        connect(element, behaviour);
                    }
                }
            }
        }
    }

    /**
     * @param { Iterable<HTMLElement> } elements 
     */
    disconnect(elements) {
        for (const element of elements) {
            /** @type Map<typeof Behaviour, Behaviour> */
            const instances = element[INSTANCES] ?? undefined;
            if (instances !== undefined) {
                for (const value of instances.values()) {
                    value.isConnected = false;
                }
            }
        }
    }

    /**
     * @param { MutationRecord } mutation 
     */
    handleMutation(mutation) {

        // No automatic notification if attributes are removed

        /** @type Iterable<HTMLElement> */
        const additions = (mutation.type === "attributes") ? [mutation.target] : allElements(mutation.addedNodes);
        this.connect(additions);

        if (mutation.removedNodes.length > 0) {
            /** @type Iterable<HTMLElement> */
            const removals = allElements(mutation.removedNodes);
            this.disconnect(removals);
        }
    }

    /**
     * Starts watching the document and connecting behaviours to relevant elements
     * @param { Document } document 
     */
    enable(document) {
        /** @type { { registry: BehaviourRegistry, controller: AbortController }[] } */
        const registries = document[REGISTRIES] ?? (document[REGISTRIES] = []);

        const existing = registries.find(o => o.registry === this);
        if (existing !== undefined) {
            // Already enabled
            return;
        }

        const controller = listenToElement(document.body, (mutations, observer) => {
            for (const mutation of mutations) {
                this.handleMutation(mutation);
            }
        });

        registries.push({ registry: this, controller });

        this.connect(document.body.querySelectorAll("*"));
    }

    /**
     * Stops watching the document. Does not disconnect already connected behaviours.
     * @param { Document } document 
     */
    disable(document) {
        /** @type { { registry: BehaviourRegistry, controller: AbortController }[] } */
        const registries = document[REGISTRIES] ?? undefined;
        if (registries !== undefined) {
            const existing = registries.find(o => o.registry === this);
            if (existing !== undefined) {
                existing.controller.abort();
                existing.controller = undefined;
                existing.registry = undefined;
            }
        }
    }
}

const customBehaviours = new BehaviourRegistry();

export function enableBehaviours(document) {
    customBehaviours.enable(document);
}

export function disableBehaviours(document) {
    customBehaviours.disable(document);
}