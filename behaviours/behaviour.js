// (c) Callionica 2024
//
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
// In this version of the library, behaviours are enabled on a per-target basis.
// Call `enableBehaviours(document)` to enable behaviour handling for that document.
// It is not necessary to call `enableBehaviours(document)` for the main document since it will be enabled automatically.
// You can still call it if you want to control when the behaviours are updated, or you can call `disableBehaviours(document)` if you 
// prefer behaviours not to be enabled for the main document.
//
// You can also pass an element to `enableBehaviours` to limit the scope to that element.
//
// You can get a behaviour from an element if you know the type (or base type) of the behavior:
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

/**
 * Capitalizes the first character in the string
 * @param { string } name 
 */
function capitalizeFirst(name) {
    return name[0].toUpperCase() + name.substring(1);
}

/**
 * If you have a method that needs to be called under different conditions
 * but you only want the method to be called once per turn, you need a microtask
 * property that you can set to true when the method needs to be called.
 * No matter how many times you set the property to true the method will be called
 * only once.
 * Example: `refresh` method, `needsRefresh` microtask property.
 * Example: `layout` method, `needsLayout` microtask property.
 * @param { object } cls The class on which you wish to add the boolean property which triggers a microtask
 * @param { string } methodName The name of the method for which you need a microtask property (if method is `refresh`, the microtask property will be `needsRefresh`)
 **/
function addMicrotaskProperty(cls, methodName) {
    const propertyName = `needs${capitalizeFirst(methodName)}`;
    const dataName = `${propertyName}_`;

    Object.defineProperty(cls.prototype, propertyName, {
        get() {
            return this[dataName] ?? false;
        },
        set(value) {
            if (value && (value !== this[dataName])) {
                this[dataName] = true;

                queueMicrotask(() => {
                    if (this[dataName]) {
                        this[dataName] = false;
                        const fn = this[methodName]?.bind(this) ?? undefined;
                        if (fn !== undefined) {
                            fn();
                        }
                    }
                });
            }
        }
    });
}

/**
 * Attribute names allow us to know when a behaviour should apply to an element.
 * @typedef { string } AttributeName
 * */

/**
 * A string that cannot be an attribute name (it ends with an equals sign).
 * They're used to say that a behaviour will always be available on a relevant element.
 * There's still a name here so type inheritance & overriding works appropriately, but the name doesn't have to be used as an attribute.
 * @typedef { `${string}=` } NotAttributeName
 * */

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

/**
 * Behaviour keys that do not require a matching element to have any attributes 
 * @typedef { NotAttributeName | Symbol } UniversalBehaviourKey
 * */

/**
 * A behaviour key is used to associate a behaviour with an element
 * @typedef { AttributeName | UniversalBehaviourKey } BehaviourKey
 * */

/** @typedef { Record<BehaviourKey, typeof Behaviour> } BehaviourRecord */

/**
 * @param { BehaviourKey } key 
 * @returns { key is AttributeName }
 */
function isAttributeName(key) {
    return !((typeof key === "symbol") || key.endsWith("="));
}

const INSTANCES = Symbol("behaviour-instances");

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
 * Tests whether the `base` object is in the prototype chain of the `derived` object
 * @param { object } derived 
 * @param { object } base 
 */
function isBase({ derived, base }) {
    if (derived === undefined || base === undefined) {
        throw "Invalid argument to isBase";
    }
    for (const link of chain(derived)) {
        if (link === base) {
            return true;
        }
    }
    return false;
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

/**
 * A list of all entries including Symbol-keyed ones
 * @param { object } o 
 * @returns { Iterable<[string | Symbol, any]> }
 */
function* allEntries(o) {
    for (const e of Object.entries(o)) {
        yield e;
    }

    for (const s of Object.getOwnPropertySymbols(o)) {
        yield [s, o[s]];
    }
}

/**
 * Connects a behaviour of the specified type to an element
 * if the element doesn't already have a behaviour of that exact type.
 * @param { HTMLElement } element 
 * @param { typeof Behaviour } behaviourType 
 */
function connect(element, behaviourType) {
    /** @type Map<typeof Behaviour, Behaviour> */
    const instances = element[INSTANCES] ?? (element[INSTANCES] = new Map());

    // Note that we check for *exact* behaviour type here
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
    /** @type Map<typeof Behaviour, Behaviour> */
    const instances = element[INSTANCES] ?? undefined;
    if (instances === undefined) {
        return undefined;
    }

    // Because we first check using exact match on the type,
    // if the element has both MyBaseBehaviour and MyDerivedBehaviour
    // and we ask for MyBaseBehaviour, we'll get the base behaviour.
    // If the element only has MyDerivedBehaviour, we fall through to the next check.
    const existing = instances?.get(behaviourType);
    if (existing !== undefined) {
        return existing;
    }

    // If we are given MyBaseBehaviour and we have stored MyDerivedBehaviour,
    // we still need to find the behaviour and return it
    for (const [behaviourType_, behavior_] of instances.entries()) {
        if (isBase({ derived: behaviourType_, base: behaviourType })) {
            return behavior_;
        }
    }

    return undefined;
}

/** @typedef { { key: BehaviourKey, elementType: typeof HTMLElement, behaviourType: typeof Behaviour, existingBehaviourType: typeof Behaviour } } Warning */

/**
 * A `Target` is a document or element in which behaviours have been enabled
 * @typedef { Node } Target
 * */

export class BehaviourRegistry {

    /**
     * This contains the behaviours directly applied to a particular element type.
     * To get the effective behaviours for a particular element type, we need to
     * traverse the class hierarchy (prototype chain) which is handled by `getBehaviourRecord` 
     * @type Map<typeof HTMLElement, BehaviourRecord >
     * */
    elementTypeToBehaviourRecord = new Map();

    /**
     * Stores targets that we're watching for changes 
     * @type Map<Target, { registry: BehaviourRegistry, controller: AbortController } >
     * */
    targetToRegistry = new Map();

    /**
     * Targets that need to be re-examined for behaviours
     * @type Target[]
     */
    queue = [];

    /**
     * We only ensure the main document is enabled once on the first call to `register`
     * so that callers can successfully disable this document without us re-enabling it
     */
    shouldHandleMainDocument = false;

    constructor(shouldHandleMainDocument = false) {
        this.shouldHandleMainDocument = shouldHandleMainDocument;
    }

    /**
     * Add a target to the queue - the target node will be examined for elements/attributes that need to be connected to behaviours.
     * The processing of the target happens in a microtask.
     * @param { Target } target 
     * */
    addToQueue(target) {
        if (!this.queue.includes(target)) {
            this.queue.push(target);
            this.needsUpdate = true;
        }
    }

    /**
     * 
     * @param { Target } target 
     */
    updateTarget(target) {
        const existing = this.targetToRegistry.get(target);

        if (existing === undefined) {       
            const controller = listenToElement(target, (mutations, observer) => {
                for (const mutation of mutations) {
                    this.handleMutation(mutation);
                }
            });

            this.targetToRegistry.set(target, { registry: this, controller });
        }

        this.connect(target.querySelectorAll("*"));
    }

    /**
     * Processes all the targets in the queue.
     * Adds mutation observation if necessary and
     * examines all existing target content to attach behaviours if necessary.
    */
    update() {
        const targets = this.queue;
        this.queue = [];

        for (const target of targets) {
            this.updateTarget(target);
        }
    }

    /**
     * @param { typeof HTMLElement } elementType 
     */
    getOrCreateBehaviourRecord(elementType) {
        const elementTypeToBehaviourRecord = this.elementTypeToBehaviourRecord;
        let record = elementTypeToBehaviourRecord.get(elementType);
        if (record === undefined) {
            record = {};
            elementTypeToBehaviourRecord.set(elementType, record);
        }
        return record;
    }

    /**
     * Returns the effective record of behaviours/attributes that have been
     * applied to the specified element type and any base classes.
     * @param { typeof HTMLElement } elementType 
     * @returns { BehaviourRecord }
     */
    getBehaviourRecord(elementType) {
        const elementTypeToBehaviourRecord = this.elementTypeToBehaviourRecord;
        let value = {};

        for (const link of chain(elementType)) {
            value = { ...elementTypeToBehaviourRecord.get(link), ...value };
        }

        return value;
    }

    /**
     * Registers a behaviour and a set of attributes as being usable with a particular element type (and its derived classes).
     * Returns a list of warnings if there are existing behaviours using the same attribute names anywhere in the element class hierarchy.
     * The warnings may be completely benign (if you want to provide a different behaviour for an attribute in a derived class, for example)
     * or they may indicate that you have a conflict with two behaviours both trying to use the same attribute names.
     * @param { typeof Behaviour } behaviourType 
     * @param { typeof HTMLElement } elementType 
     * @param { BehaviourKey[] } keys An array of attribute names or non-attribute strings or Symbols
     */
    register(behaviourType, elementType, keys) {
        if (!Array.isArray(keys)) {
            throw "attributes should be an array";
        }

        /** @type Warning[] */
        const warnings = [];
        const behaviours = this.getBehaviourRecord(elementType);
        for (const key of keys) {
            /** @type { (typeof Behaviour) | undefined } */
            const existingBehaviourType = behaviours[key];
            if (existingBehaviourType !== undefined) {
                warnings.push({ key, elementType, behaviourType, existingBehaviourType });
            }

            const localBehaviours = this.getOrCreateBehaviourRecord(elementType);
            localBehaviours[key] = behaviourType;
        }

        // For the first registration, we add the main document to the queue so that users cannot forget to call enable on it
        // We only do this once so that users can choose to disable the main document
        if (this.shouldHandleMainDocument) {
            this.shouldHandleMainDocument = false;
            this.addToQueue(globalThis.document);
        }

        // If behaviours get registered after a target is enabled,
        // we need to update existing targets
        for (const target of this.targetToRegistry.keys()) {
            this.addToQueue(target);
        }

        return { warnings };
    }

    /**
     * Examines all the elements and determines if they have attributes that
     * require them to be connected to a behaviour
     * @param { Iterable<HTMLElement> } elements 
     */
    connect(elements) {
        for (const element of elements) {
            const behaviourRecord = this.getBehaviourRecord(element.constructor);
            if (behaviourRecord !== undefined) {
                for (const [key, behaviour] of allEntries(behaviourRecord)) {
                    if (!isAttributeName(key) || element.hasAttribute(key)) {
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
     * Starts watching the target and connecting behaviours to relevant elements
     * @param { Target } target 
     */
    enable(target) {
        // Here we add the specified target to the queue then immediately process the queue
        // to ensure that all routes are going through the same code paths.
        this.addToQueue(target);
        this.update();
    }

    /**
     * Stops watching the target. Does not disconnect already connected behaviours.
     * @param { Target } target 
     */
    disable(target) {
        if (target === globalThis.document) {
            // Disable main document handling by saying it's already done
            // This code means that users can disable the main document before any registrations.
            // Without this code, users would have to ensure that disable is called after the first registration.
            this.shouldHandleMainDocument = false;
        }

        // Remove this target from the queue if it's there
        const index = this.queue.indexOf(target);
        if (index >= 0) {
            this.queue.splice(index, 1);
        }

        // Stop listening to this target if we've started listening
        const existing = this.targetToRegistry.get(target);
        if (existing !== undefined) {
            existing.controller.abort();
            this.targetToRegistry.delete(target);
        }
    }
}

addMicrotaskProperty(BehaviourRegistry, "update");

// The global behaviour registry has main document handling turned on
// Other behaviour registries default to main document handling being off
export const customBehaviours = new BehaviourRegistry(true);

/**
 * Starts watching the target and connecting behaviours to relevant elements
 * @param { Target } target 
 */
export function enableBehaviours(target) {
    customBehaviours.enable(target);
}

/**
 * Stops watching the target. Does not disconnect already connected behaviours.
 * @param { Target } target 
 */
export function disableBehaviours(target) {
    customBehaviours.disable(target);
}

/**
 * Returns the effective record of behaviours/attributes that have been
 * applied to the specified element type and any base classes.
 * @param { typeof HTMLElement } elementType 
 * @returns { BehaviourRecord }
 */
export function getBehaviourRecord(elementType) {
    return customBehaviours.getBehaviourRecord(elementType);
}

/**
 * Registers a behaviour and a set of attributes as being usable with a particular element type (and its derived classes).
 * Returns a list of warnings if there are existing behaviours using the same attribute names anywhere in the element class hierarchy.
 * The warnings may be completely benign (if you want to provide a different behaviour for an attribute in a derived class, for example)
 * or they may indicate that you have a conflict with two behaviours both trying to use the same attribute names.
 * @param { typeof Behaviour } behaviourType 
 * @param { typeof HTMLElement } elementType 
 * @param { BehaviourKey[] } keys An array of attribute names or non-attribute strings or Symbols
 */
export function registerBehaviour(behaviourType, elementType, keys) {
    return customBehaviours.register(behaviourType, elementType, keys);
}