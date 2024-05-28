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
 * Tests whether the base object is in the prototype chain of the derived object
 * @param { object } derived 
 * @param { object } base 
 */
function isBase(derived, base) {
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
    const existing = instances?.get(behaviourType);
    if (existing !== undefined) {
        return existing;
    }

    // If we are given MyBaseBehaviour and we have stored MyDerivedBehaviour,
    // we still need to find the behaviour and return it
    for (const [behaviourType_, behavior_] of instances.entries()) {
        if (isBase(behaviourType_, behaviourType)) {
            return behavior_;
        }
    }

    return undefined;
}

class BehaviourRegistry {

    /**
     * This contains the behaviours directly applied to a particular element type.
     * To get the effective behaviours for a particular element type, we need to
     * traverse the class hierarchy (prototype chain) which is handled by `getBehaviourRecord` 
     * @type Map<typeof HTMLElement, Record<AttributeName, typeof Behaviour> >
     * */
    elementTypeToBehaviourRecord = new Map();

    /**
     * Stores documents that we're watching for changes 
     * @type Map<Document, { registry: BehaviourRegistry, controller: AbortController } >
     * */
    documentToRegistry = new Map();

    /**
     * Documents that need to be re-examined for behaviours
     * @type Document[]
     */
    updateQueue = [];

    /**
     * Add a document to the update queue - the entire document will be examined for elements/attributes that need to be connected to behaviours.
     * The processing of the document happens in a microtask.
     * @param { Document } document 
     * */
    addToUpdateQueue(document) {
        if (!this.updateQueue.includes(document)) {
            this.updateQueue.push(document);
            this.needsUpdate = true;
        }
    }

    updateDocument(document) {
        this.connect(document.body.querySelectorAll("*"));
    }

    /** Processes all the documents in the update queue */
    update() {
        const documents = this.updateQueue;
        this.updateQueue = [];

        for (const document of documents) {
            this.updateDocument(document);
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
     * @returns { Record<AttributeName, typeof Behaviour> }
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
     * @param { string[] } attributes 
     */
    register(behaviourType, elementType, attributes) {
        if (!Array.isArray(attributes)) {
            throw "attributes should be an array";
        }

        const warnings = [];
        const behaviours = this.getBehaviourRecord(elementType);
        for (const attribute of attributes) {
            const existing = behaviours[attribute];
            if (existing !== undefined) {
                warnings.push({ attribute, behaviourType, existing });
            }

            const localBehaviours = this.getOrCreateBehaviourRecord(elementType);
            localBehaviours[attribute] = behaviourType;
        }

        // If stuff gets registered after the document is enabled,
        // we need to update existing documents
        for (const document of this.documentToRegistry.keys()) {
            this.addToUpdateQueue(document);
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
        const existing = this.documentToRegistry.get(document);
        if (existing !== undefined) {
            // Already enabled
            return;
        }

        const controller = listenToElement(document.body, (mutations, observer) => {
            for (const mutation of mutations) {
                this.handleMutation(mutation);
            }
        });

        this.documentToRegistry.set(document, { registry: this, controller });

        this.updateDocument(document);
    }

    /**
     * Stops watching the document. Does not disconnect already connected behaviours.
     * @param { Document } document 
     */
    disable(document) {
        const existing = this.documentToRegistry.get(document);
        if (existing !== undefined) {
            existing.controller.abort();
            this.documentToRegistry.delete(document);
        }
    }
}

addMicrotaskProperty(BehaviourRegistry, "update");

const customBehaviours = new BehaviourRegistry();

export function enableBehaviours(document) {
    customBehaviours.enable(document);
}

export function disableBehaviours(document) {
    customBehaviours.disable(document);
}

export function getBehaviourRecord(elementType) {
    return customBehaviours.getBehaviourRecord(elementType);
}

export function registerBehaviour(behaviourType, elementType, attributes) {
    return customBehaviours.register(behaviourType, elementType, attributes);
}