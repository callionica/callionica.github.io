// @ts-check
// deno-lint-ignore-file

import { TEXT_PROPERTIES } from "./parser.js";
import { Document, View, Item, PropertyKey, Property, Value, ValueHierarchy, ValueReference, FilterItems, ValueText, parseValues, FilterProperties } from "./model.js";

export const NEW_LINE = "↵";

export class HTMLView {
    /**
     * @param { View } view  
     * @param { HTMLElement } element 
     */
    constructor(view, element) {
        /** @type { View } */
        this.view = view;

        /** @type { HTMLElement } */
        this.element = element;

        element.callionica = { view };

        /** @type { HTMLSelectElement } */
        this.typeElement = /** @type { HTMLSelectElement } */ (element.querySelector(".new-property-type") ?? undefined);

        /** @type { HTMLSelectElement } */
        this.propertyElement = /** @type { HTMLSelectElement } */ (element.querySelector(".new-property-name") ?? undefined);

        /** @type { HTMLButtonElement } */
        this.buttonElement = /** @type { HTMLButtonElement } */ (element.querySelector(".new-property-action") ?? undefined);

        /** @type { HTMLSelectElement } */
        this.displayElement = /** @type { HTMLSelectElement } */ (element.querySelector(".filter-properties") ?? undefined);

        /** @type { HTMLSelectElement } */
        this.sortingElement = /** @type { HTMLSelectElement } */ (element.querySelector(".filter-sorting") ?? undefined);

        this.propertyElement.onkeydown = (e) => {
            switch (e.key) {
                case "1":
                case "2":
                case "3":
                case "4":
                case "5":
                case "6":
                case "7":
                case "8":
                case "9":
                case "0":
                    if (e.ctrlKey) {
                        const index = parseInt(e.key, 10) - 1;
                        const value = (index < 0) ? "Content" : this.propertyElement.options[index]?.value;
                        if (value !== undefined) {
                            this.propertyElement.value = value;
                            this.checkValue();
                            this.valueElement.focus();
                        }
                        return false;
                    }
                    break;
            }
        };

        this.propertyElement.onchange = () => { this.checkValue(); };
        this.typeElement.onchange = () => { this.checkValue(); };

        this.displayElement.onchange = () => this.updatePropertyFilter();
        this.sortingElement.onchange = () => {
            this.view.sorting = /** @type {"document" | "sequence" | "time"} */ (this.sortingElement.value);
        };

        this.updatePropertyFilter();

        /** @type { HTMLInputElement } */
        this.valueElement = /** @type { HTMLInputElement } */ (element.querySelector(".new-property-value") ?? undefined);

        this.valueElement.onkeydown = (e) => {
            if (e.altKey && e.key === "Enter") {
                const v = this.valueElement;
                v.setRangeText(NEW_LINE, v.selectionStart ?? 0, v.selectionEnd ?? 0, "end");
                e.cancelBubble = true;
                return false;
            }
        };

        this.view.changed.subscribe(() => {
            this.refresh();
        });

        const excludeElements = ["A", "BUTTON", /*"INPUT",*/ "SELECT"];

        element.onclick = (e) => {
            if (["A", "BUTTON", "INPUT", "SELECT"].includes(e?.target?.nodeName ?? "")) {
                return;
            }

            return this.click(e);
        };

        element.onkeydown = (e) => {
            if (excludeElements.includes(e.target?.nodeName ?? "")) {
                return;
            }

            console.log("down", e.key);

            switch (e.key) {
                case "Z":
                    if (e.ctrlKey) {
                        this.view.document.redo();
                        return false;
                    }
                    break;
                case "z":
                    if (e.ctrlKey) {
                        this.view.document.undo();
                        return false;
                    }
                    break;
                case "Backspace":
                    if (e.ctrlKey) {
                        this.view.deleteSelected();
                        return false;
                    }
                    break;
                case "Enter":
                    const btn = this.element.querySelector("button") ?? undefined;
                    if (btn !== undefined) {
                        btn.click();
                        return false;
                    }
                    break;
                case "c":
                    if (e.ctrlKey) {
                        navigator.clipboard.writeText(this.view.selectionAsData());
                        return false;
                    }
                    break;
                case "v":
                    if (e.ctrlKey) {
                        navigator.clipboard.readText().then(text => {
                            this.view.load(text);
                        });
                        return false;
                    }
                    break;
                case "a":
                    if (e.ctrlKey) {
                       this.view.selectAll();
                        return false;
                    }
                    break;
                case "ArrowUp":
                    if (e.shiftKey) {
                        this.view.extendUp();
                        return false;
                    } else {
                        this.view.selectUp();
                        return false;
                    }
                    break;
                case "ArrowDown":
                    if (e.shiftKey) {
                        this.view.extendDown();
                        return false;
                    } else {
                        this.view.selectDown();
                        return false;
                    }
                    break;
                case "1":
                case "2":
                case "3":
                case "4":
                case "5":
                case "6":
                case "7":
                case "8":
                case "9":
                case "0":
                    if (e.ctrlKey) {
                        const index = parseInt(e.key, 10) - 1;
                        const value = (index < 0) ? "Content" : this.propertyElement.options[index]?.value;
                        if (value !== undefined) {
                            this.propertyElement.value = value;
                            this.checkValue();
                            this.valueElement.focus();
                        }
                        return false;
                    }
                    break;
                case "p":
                    if (e.ctrlKey) {
                        if (e.altKey) {
                            this.typeElement.value = "property-replace";
                        } else {
                            this.typeElement.value = "property";
                        }
                        this.checkValue();
                        this.valueElement.focus();
                        return false;
                    }
                    break;
                case "e":
                    if (e.ctrlKey) {
                        if (e.altKey) {
                            this.typeElement.value = "property-edit";
                        } else {
                            this.typeElement.value = "property-edit";
                        }
                        this.checkValue();
                        this.valueElement.focus();
                        return false;
                    }
                    break;
                case "n":
                    if (e.ctrlKey) {
                        const type = this.typeElement;
                        const val = this.valueElement;
                        type.value = "item";
                        this.checkValue();
                        val.focus();
                        return false;
                    }
                    break;
                case "r":
                    if (e.ctrlKey) {
                        this.view.itemFilter = new FilterItems("");
                        return false;
                    }
                    break;
            }
        };

        const ti = /** @type { HTMLInputElement } */ (element.querySelector(".filter-tag-include") ?? undefined);
        const te = /** @type { HTMLInputElement } */ (element.querySelector(".filter-tag-exclude") ?? undefined);
        if (ti !== undefined) {
            ti.value = this.view.itemFilter.includeTags.join(", ");
            te.value = this.view.itemFilter.excludeTags.join(", ");
            ti.onkeydown = (e) => {

                switch (e.key) {
                    case "Escape":
                        e.cancelBubble = true;
                        ti.value = this.view.itemFilter.includeTags.join(", ");
                        break;
                    case "Enter":
                        e.cancelBubble = true;

                        const line = ti.value;
                        const values = parseValues(this.view.document, "Tag", line);
                        const tags = /** @type { ValueHierarchy[] } */ (values.filter(x => x instanceof ValueHierarchy));

                        const filter = new FilterItems("");
                        filter.includeTags = tags;
                        filter.excludeTags = this.view.itemFilter.excludeTags;
                        this.view.itemFilter = filter;

                        ti.value = tags.join(", ");
                        break;
                }
                // e.preventDefault();
            };
            te.onkeydown = (e) => {
                switch (e.key) {
                    case "Escape":
                        e.cancelBubble = true;
                        te.value = this.view.itemFilter.excludeTags.join(", ");
                        break;
                    case "Enter":
                        e.cancelBubble = true;

                        const line = te.value;
                        const values = parseValues(this.view.document, "Tag", line);
                        const tags = /** @type { ValueHierarchy[] } */ (values.filter(x => x instanceof ValueHierarchy));

                        const filter = new FilterItems("");
                        filter.excludeTags = tags;
                        filter.includeTags = this.view.itemFilter.includeTags;
                        this.view.itemFilter = filter;

                        te.value = tags.join(", ");
                        break;
                }
                // e.preventDefault();
            };
            ti.onblur = (e) => { ti.value = this.view.itemFilter.includeTags.join(", "); };
            te.onblur = (e) => { te.value = this.view.itemFilter.excludeTags.join(", "); };
        }

        const np = element.querySelector(".new-property") ?? undefined;
        if (np !== undefined) {
            const type = this.typeElement;
            const val = this.valueElement;
            const prop = /** @type { HTMLSelectElement } */ (np.querySelector(".new-property-name") ?? undefined);
            const incr = /** @type { HTMLSelectElement } */ (np.querySelector(".new-property-increment") ?? undefined);
            const btn = this.buttonElement;
            if (btn !== undefined) {
                btn.onclick = () => {
                    const property = prop.value;
                    const text = val.value.trim();

                    /** @type { Item[] } */
                    let items;
                    if (type.value === "item") {
                        items = [this.view.createItem().item];
                    } else {
                        items = this.view.selected_.map(vi => vi.item);
                    }

                    for (const item of items) {
                        if (["property-replace", "property-edit"].includes(type.value)) {
                            const p = item.property(property);
                            if (p !== undefined) {
                                item.removeProperty(p);
                            }
                        }

                        const values = parseValues(this.view.document, property, text);

                        if (TEXT_PROPERTIES.includes(property.toLowerCase())) {
                            const lines = text.split(NEW_LINE);
                            for (const value of lines) {
                                item.addValue(property, value.trim());
                            }
                            val.select();
                        } else {
                            const increment = parseInt(incr.value, 10);
                            if (["ID", "Sequence"].includes(property) && increment > 0) {
                                let changeValue = false;
                                let changedValues = [];
                                const shouldBump = this.typeElement.value !== "property-edit";
                                for (const value of values) {
                                    const uniqueValue = this.view.document.unique(property, value, increment);
                                    if (uniqueValue !== undefined) {
                                        item.addValue(property, uniqueValue);
                                        const v = shouldBump ? this.view.document.bump(uniqueValue.toString(), increment) : uniqueValue;
                                        changedValues.push(v);
                                        changeValue = true;
                                    } else {
                                        item.addValue(property, value);
                                        changedValues.push(value);
                                    }
                                }

                                if (changeValue) {
                                    val.value = changedValues.join(", ");
                                }

                            } else {
                                for (const value of values) {
                                    item.addValue(property, value);
                                };
                            }
                        }


                    }
                };
            }
        }

        this.refresh();
    }

    get htmlDocument() {
        return this.element.ownerDocument;
    }

    updatePropertyFilter() {
        const filter = new FilterProperties(this.displayElement.value);
        const properties = this.displayElement.value.split(",").map(n => this.view.document.propertyKeys.ensureKey(n.trim()));
        filter.include = properties;
        this.view.propertyFilter = filter;
    }

    /**
     * 
     * @param { MouseEvent } e 
     */
    click(e) {
        let currentItem;
        let current = /** @type { HTMLElement | undefined } */ (e.target) ?? undefined;
        while (current !== undefined) {
            const item = /** @type { import("./model.js").ViewItem | undefined } */ (current.callionica?.item);
            if (item !== undefined) {
                currentItem = item;
                break;
            }
            current = current.parentElement ?? undefined;
        }
        console.log(currentItem);

        if (currentItem !== undefined) {
            if (e.metaKey) {
                this.view.toggleSelection(currentItem);
            } else if (e.shiftKey) {
                this.view.extendSelection(currentItem);
            } else {
                this.view.current = currentItem;
            }

            if (this.valueElement !== this.htmlDocument.activeElement) {
                this.valueElement.focus();
            }
        }
    }

    focus() {
        this.valueElement.focus();
    }

    /**
     * @param { string } name
     */
    createElement(name) {
        return this.htmlDocument.createElement(name);
    }

    /**
     * @param {HTMLElement} element
     * @param {string} className
     */
    ensure(element, className) {
        let child = element.querySelector("." + className) ?? undefined;
        if (child !== undefined) {
            child.innerHTML = "";
        } else {
            child = this.createElement("div");
            child.classList.add(className);
            element.append(child);
        }

        return /** @type { HTMLElement } */ (child);
    }

    /**
     * 
     * @param { Value } value 
     * @param { HTMLElement } element 
     */
    createValue(value, element) {
        element.callionica = { value };

        if (value instanceof ValueHierarchy) {
            for (const key of value.keys) {
                const keyElement = this.createElement("span");
                keyElement.classList.add("value-level");
                keyElement.innerText = key.name;
                element.append(keyElement);
            }
        } else if (value instanceof ValueReference) {
            const relationElement = this.createElement("span");
            relationElement.classList.add("value-relation");
            relationElement.innerText = value.relation.name;

            const targetElement = this.createElement("span");
            targetElement.classList.add("value-target");
            targetElement.innerText = value.target.toString();

            element.append(relationElement, targetElement);
        } else {
            const textElement = this.createElement("span");
            textElement.classList.add("value-text");
            textElement.innerText = value.toString();

            element.append(textElement);
        }

        if (false) {
            const removeValueElement = this.createElement("button");
            removeValueElement.classList.add("value-remove");
            removeValueElement.innerText = "-";

            const addValueElement = this.createElement("button");
            addValueElement.classList.add("value-add");
            addValueElement.innerText = "+";

            element.append(removeValueElement, addValueElement);
        }
    }

    /**
     * 
     * @param { Property } property 
     * @param { HTMLElement } element 
     */
    createProperty(property, element) {
        element.callionica = { property };

        const nameElement = this.ensure(element, "property-name");
        const valuesElement = this.ensure(element, "property-values");

        element.dataset.id = property.key.key;
        nameElement.innerText = property.key.name;

        for (const value of property.values) {
            const valueElement = this.createElement("div");
            valueElement.classList.add("value");
            this.createValue(value, valueElement);
            valuesElement.append(valueElement);
        }
    }

    /**
     * 
     * @param { import("./model.js").ViewItem } item 
     * @param { HTMLElement } element 
     */
    createItem(item, element) {
        element.callionica = { item };

        const propertiesElement = this.ensure(element, "properties");

        for (const property of item.properties) {
            // Skip emitting properties with no values
            if (property.values.length === 0) {
                continue;
            }
            const propertyElement = this.createElement("div");
            propertyElement.classList.add("property");
            this.createProperty(property, propertyElement);
            propertiesElement.append(propertyElement);
        }
    }

    checkValue() {
        this.buttonElement.innerText = this.typeElement.selectedOptions[0].innerText;

        if (this.typeElement.value === "property-edit") {
            const property = this.propertyElement.value.toLowerCase();
            const values = this.view.current?.item.property(property)?.values;
            const text = (() => {
                if (TEXT_PROPERTIES.includes(property)) {
                    return values?.join(NEW_LINE) ?? "";
                } else {
                    return values?.join(", ") ?? "";
                }
            })();

            this.valueElement.value = text;
        }
    }

    refresh() {
        console.log("refresh");

        this.checkValue();

        const ti = /** @type { HTMLInputElement } */ (this.element.querySelector(".filter-tag-include") ?? undefined);
        const te = /** @type { HTMLInputElement } */ (this.element.querySelector(".filter-tag-exclude") ?? undefined);
        if (ti !== undefined) {
            ti.value = this.view.itemFilter.includeTags.join(", ");
            te.value = this.view.itemFilter.excludeTags.join(", ");
        }

        const itemsElement = this.ensure(this.element, "items");

        let currentElement;
        for (const item of this.view.items) {
            const itemElement = this.createElement("div");
            itemElement.classList.add("item");
            if (this.view.isSelected(item)) {
                itemElement.setAttribute("data-current", "true");
                if (this.view.active?.item === item?.item) {
                    currentElement = itemElement;
                }
            }
            this.createItem(item, itemElement);
            itemsElement.append(itemElement);
        }

        currentElement?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest",
        });
    }
}