const TMP_COMBOSTYLE = document.createElement('template'),
      TMP_PLUSSIGN = document.createElement('template'),
      TMP_ARROW = document.createElement('template'),
      TMP_CLOSE = document.createElement('template');

TMP_COMBOSTYLE.innerHTML = `
    <style>
        :host {
            display: inline-block;
            border: 1px solid silver;
            padding: 0;
        }

        :host:(input:disabled) {
        
            border: 2px solid red;
        }

        #divCombo.jom-combo {
            height: 100%;
            display: inline-block;
            position: relative;            
            border-radius: inherit;           
        }

        #inpCombo.jom-input {
            height: 100%;
            /* outline: 2px solid transparent; */
            padding: 0 0 0 0.5rem;
            outline: none;
            border: none;
            border-radius: inherit;
            font: inherit;
        }

        .jom-input:disabled {
            background-color: field;
            color: fieldtext;
        }

        .jom-combo ul {
            position: absolute;
            width: 100%;
            z-index: 99998;
            list-style: none;
            padding: unset;
            margin: unset;
            margin-top: 1px;
            overflow-y: hidden;
        }

        .jom-combo ul:has(li) {
            border-bottom: 1px solid silver;
        }

        .jom-combo ul.scroll {
            overflow-y: scroll;
        }

        li.jom-list-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-left: 1px solid silver;
            border-right: 1px solid silver;
            background-color: field;
            padding: var(--combo-item-padding, 0.25rem 0.5rem);
        }

        li.jom-list-item:last-child {
            border-bottom: 1px solid silver;
        }

        li.jom-list-item[selected] {
            color: var(--combo-selected-color, white);
            background-color: var(--combo-selected-background-color, #0075ff);
        }

        .combo-icon {
            position: absolute;
            height: var(--combo-arrow-size, 1.25rem);
            width: var(--combo-arrow-size, 1.25rem);
            top: 50%;
            transform: translateY(-50%);
            right: 1px;
            cursor: pointer;
            z-index: 99999;
        }

        .combo-delete {
            display: flex;
            align-items: center;
            justify-content: center;
            aspect-ratio: 1 / 1;
            height: 0.75rem;
            cursor: pointer;
        }

        .combo-delete:hover svg {
            mix-blend-mode: exclusion;
            fill: var(--combo-selected-color, white);
            transform: scale(1.25);
        }

        .combo-icon svg {
            stroke: var(--combo-accent-color, #0075ff);
            fill: var(--combo-accent-color, #0075ff);
        }

        :host([disabled]) svg {
            stroke: #aaa;
            fill: #aaa;
        }

        :host[hidden], [hidden] {
            display: none;
        }
    </style>`;

TMP_PLUSSIGN.innerHTML = `
    <div id="divPlus" class="combo-icon" hidden>
        <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 200"
            stroke-width="20">
            <path d="M40 100 h120 M100 40 v120z"/>
        </svg>
    </div>`;

TMP_ARROW.innerHTML = `
    <div id="divArrow" class="combo-icon" hidden>
        <svg xmlns="http://www.w3.org/2000/svg"
            id="svgArrow"
            viewBox="0 0 100 100">
            <path d="M20 35 l30 30 l30-30z"/>
        </svg>
    </div>`;

TMP_CLOSE.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="#000000A0">
        <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"/>
    </svg>`;

class Combobox extends HTMLElement {
    #size = 6;
    #type = 'combo';
    #dropped = false;
    #listindex = -1;
    #options = null;
    #internals = null;

    /**
     * This returns all writable (and readable) properties of this class.
     * If those wanted who are readonly, the code must be changed from: <br>
     * ...=> typeof descriptor.set  TO: ...=> typeof descriptor.GET...
     * @readonly
     */
    get properties() { 
        // https://stackoverflow.com/questions/39310890/get-all-static-getters-in-a-class
        const props = Object.entries(Object.getOwnPropertyDescriptors(Combobox.prototype))
        .filter(([key, descriptor]) => typeof descriptor.set === 'function').map(([key]) => key);
        return props;
    }


    /**
     * Returns or assigns the displayed list items.
     */
    get options() {
        if (this.#options) return this.#options;
        if (this.hasAttribute('options')) return this.getAttribute('options');
        return null;
    }
    set options(newOpts) {
        if (newOpts == null) return;
        // handle HTML-array like: ['Germany','United Kindom','Poland'] (regEx removes braces)
        if (typeof newOpts === 'string') {
            newOpts = newOpts.replaceAll(/[^,\p{L}\d\s]+/gu, '').split(',');
        }
        this.#options = newOpts.map(opt => opt.trim());
        if (this.#options.length == 0) {
            this.showButton(false);
            return;
        }
        const attrOpts = this.#options.join(','),
              icon = this.value.length > 0 && !this.#options.includes(this.value) ? 'plus' : 'arrow';
        this.showButton(icon);
        if (!this.hasAttribute('options')) this.setAttribute('options', attrOpts);
    }

    /**
     * Determines wether the Combobox works as a simple dropdown list 
     * or if it provides the full new functionality below. 
     * By default the type is set to combo.
     * @param {string} newType combo (default) | list
     */
    get type() { return this.#type; }
    set type(newType) {
        newType = newType?.trim();
        if (!'list combo'.includes(newType)) return;
        this.#type = newType;
        this.setAttribute('type', newType);
        if (this.input) {
            this.input.toggleAttribute('disabled', (newType === 'list') || this.disabled);
            if (newType === 'list') this.input.value = '';
        }
    }


    /**
     * Returns or determines wether the dropdown list can be extended by new entries or not.
     * If property is 'true' or the corresponding HTML attribute is set,
     * a new entry can be added by pressing the enter key or clicking the + symbol
     * that appears on the right side of the control.
     */
    get extendable() { return this.hasAttribute('extendable'); }
    set extendable(flag) {
        this.toggleAttribute('extendable', this.toBoolean(flag));
    }


    /**
     * Returns or determines if the displayed dropdown list is sorted.
     */
    get sorted() { return this.hasAttribute('sorted'); }
    set sorted(flag) {
        this.toggleAttribute('sorted', this.toBoolean(flag));
    }


    /**
     * Returns or sets the control's disabled / enabled state.
     */
    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(flag) {
        this.toggleAttribute('disabled', this.toBoolean(flag));
        this.input.toggleAttribute('disabled', this.toBoolean(flag));
    }


    /**
     * Returns or determines the count of displayed list items in the dropdown list.
     */
    get size() { return this.#size; }
    set size(newSize) {
        this.#size = Number(newSize);
        if (!this.hasAttribute('size')) this.setAttribute('size', newSize);
    }


    /**
     * Returns or set's the value of the combobox.
     */
    get value() {
        return this.input ? this.input.value : '';
    }
    set value(newVal) { 
        if (!this.hasAttribute('value') && newVal !== '') this.setAttribute('value', newVal);
        const plus = this.getElement('divPlus');
        if (this.input) this.input.value = newVal;
        if (this.extendable && newVal !== '') {
            if (!this.#options || !this.#options.includes(newVal)) {
                if (plus) this.showButton('plus');
            }
        }
    }


    /**
     * Returns or sets the name attribute.
     */
    get name() { return this.input.name; }
    set name(newName) {
        if (!this.hasAttribute('name')) this.setAttribute('name', newName);
        this.input.name = newName;
    }


    /**
     * Supplies the placeholder attribute to the internal input field.
     */
    get placeholder() { return this.hasAttribute('placeholder') ? this.getAttribute('placeholder') : ''; }
    set placeholder(newVal) {
        this.input.placeholder = newVal;
        if (!this.hasAttribute('placeholder')) this.setAttribute('placeholder', newVal);
    }


    /**
     * Tells us, if the dropdown list is open or closed
     * and toggles the arrow button on the right side.
     */
    get isDropped() { return this.#dropped; }
    set isDropped(flag) {
        this.#dropped = this.toBoolean(flag);
        const arrow = this.getElement('svgArrow');
        if (this.#dropped) {
            arrow.setAttribute('transform','scale(-1 -1)');
        } else {
            arrow.removeAttribute('transform');
        }
    }


    /**
     * Returns a reference to the component's list element.
     * @readonly
     */
    get list() { return this.getElement('lstCombo'); }


    /**
     * Returns the current selected list item.
     * @readonly
     */
    get selectedItem() { return this.shadowRoot.querySelector('li[selected]'); }


    /**
     * Returns a reference to the component's input element.
     * @readonly
     */
    get input() { return this.getElement('inpCombo'); }


    /**
     * Returns a list of attributes to be observed. <br>
     * Any attribute contained in this list will trigger the attributeChangedCallback method.
     * @see #{@link attributeChangedCallback}
     * @readonly
     */
    static get observedAttributes() {
        return ['options','type','size','value','name','extendable','sorted','placeholder','disabled'];
    }


    /**
     * Connects the control with HTML forms so that it's value will be submitted.
     * @readonly
     */
    static formAssociated = true;


    /**
     * Creates a new HTML element that unites the features of the input, select- and the datalist-element.<br>
     * The control provides a few additional features: <br>
     * - assigning the list as string or string array <br>
     * - adding new entries to the list if property 'extendable' is set to 'true' <br>
     * - setting the length of the displayed dropdown list <br>
     * - displaying the list sorted or unsorted <br>
     */
    constructor() {
        super();
        this.attachShadow({mode: 'open', delegatesFocus: true});
        this.#createChildren();
        // this.importStyleSheet();
        this.onArrowClick = this.onArrowClick.bind(this);
        this.onInput = this.onInput.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.addListItem = this.addListItem.bind(this);
        this.removeListItem = this.removeListItem.bind(this);
        this.#internals = this.attachInternals();
    }


    /**
     * Method is automatically called when the component is connected to the DOM.
     * Right moment to add event listeners and updating HTML attributes.
     */
    connectedCallback() {
        this.#updateProperties();
        if (!this.hasAttribute('role')) this.setAttribute('role', 'listbox');
        if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', 0);
        const arrow = this.getElement('divArrow'),
              plus = this.getElement('divPlus'),
              size = `${this.input.clientHeight}px`;
        this.setAttributes(plus, {height: size, width: size});
        this.setAttributes(arrow, {height: size, width: size});
        plus.addEventListener('pointerdown', this.addListItem);
        this.input.addEventListener('input', this.onInput);
        this.input.addEventListener('keydown', this.onKeydown);
        // TODO: this.addEventListener('keydown', this.onKeydown);
        // expanding the list in list mode by arrow down click?!
        arrow.addEventListener('click', this.onArrowClick);
        this.addEventListener('blur', this.collapse);
    }


    /**
     * Method to clean up the event listeners and other stuff
     * when the component is removed from DOM.
     */
    disconnectedCallback() {
        const arrow = this.getElement('divArrow'),
              plus = this.getElement('divPlus');
        plus.removeEventListener('click', this.addListItem);
        this.input.removeEventListener('input', this.onInput);
        this.input.removeEventListener('keydown', this.onKeydown);
        arrow.removeEventListener('click', this.onArrowClick);
        this.removeEventListener('blur', this.collapse);
    }


    /**
     * @description This method is called when an attribute has been changed,
     * is new assigned or when an HTML-element is connected to the DOM. <br>
     * The attribute must be listed in the observedAttributes property.
     *
     * For example: &lt INPUT name="surname" &gt would trigger this method.
     * If the attribute's value has not been changed, the function returns immediately.
     * @param {string} attrName Name of the changed attribute.
     * @param {any} oldVal The old value of the attribute.
     * @param {any} newVal The new value of the attribute.
     * @see #{@link observedAttributes}
     */
    attributeChangedCallback(attrName, oldVal, newVal) {
        if (oldVal === newVal) return; // leave immediately if there are no changes!
        if (attrName == 'options') this.options = newVal;
        if (attrName == 'type') this.type = newVal;
        if (attrName == 'size') this.size = newVal;
        if (attrName == 'name') this.name = newVal;
        if (attrName == 'value') this.value = newVal;
        if (attrName == 'placeholder') this.placeholder = newVal;
        if (attrName == 'extendable') this.extendable = this.hasAttribute('extendable');
        if (attrName == 'sorted') this.sorted = this.hasAttribute('sorted');
        if (attrName == 'disabled') this.disabled = this.hasAttribute('disabled');
    }


    /**
     * Method is called when the control is connected to a form element.
     * Here can be applied some settings between the control an the form it's in.
     * @param {HTMLElement} form The parent form of the control.
     */
    formAssociatedCallback(form) {
        // console.log(form, new FormData(form))
        // for advanced purposes...
    }


    /**
     * Filters, creates and displays the items of the list matching to the input.
     * @param {event} evt The input event of the input element.
     */
    onInput(evt) {
        if (this.disabled) {
            evt.preventDefault();
            this.input.value = '';
            return;
        }
        const searchFor = evt.target.value.toLowerCase(),
              arrMatches = [];
        this.collapse();
        this.showButton(false);
        if (searchFor.length == 0) {
            if (this.options?.length > 0) this.showButton('arrow');
            return;
        }
        if (!this.options) {
            if (this.extendable) this.showButton('plus');
            return;
        }
        for (let i = 0; i < this.options.length; i++) {
            const item = this.options[i];
            if (item.substring(0, searchFor.length).toLowerCase() === searchFor) {
                arrMatches.push(item);
            }
        }
        this.#internals.setFormValue(this.value, this.value);
        if (arrMatches.length == 0) {
            if (this.extendable) {
                this.showButton('plus');
            } else if (this.options) {
                this.showButton('arrow');
            }
            this.#listindex = -1;
            return;
        }
        const icon = (arrMatches.length > 0) ? 'arrow' : false;
        this.showButton(icon);
        this.expand(arrMatches);
    }


    /**
     * Adds a new entry to the list if the 'extendable' attribute is set.
     * If the list is expanded it will be collapsed after adding it.
     */
    addListItem(item) {
        if (this.extendable) {
            if (item instanceof PointerEvent || item == undefined) item = this.value;
            if (this.#options == null) {
                this.#options = new Array(item);
            } else if (!this.#options.includes(item)) {
                this.#options.push(item);
            }
            this.showButton('arrow');
        }
        this.collapse();
    }

    /**
     * Removes an existing list item from the options.
     * @param {Event | String | Number} item list item to be removed.
     */
    removeListItem(item) {
        if (item instanceof Event) {
            const index = item.currentTarget.dataset.index;
            this.#options.splice(index, 1);
        } else if (typeof item === 'string') {
            const index = this.#options.indexOf(item);
            if (index > -1) this.#options.splice(index, 1);
        } else if (typeof item === 'number') {
            if (item < this.#options.length) {
                this.#options.splice(item, 1);
            }
        }

        if (this.isDropped) this.expand();
        if (this.#options.length == 0) {
            this.value = '';
            this.showButton(false);
        }
    }


    /**
     * Toggles the dropdown list.
     */
    onArrowClick(evt) {
        if (this.disabled) return;
        evt.stopPropagation();
        if (this.isDropped) {
            this.collapse();
        } else {
            this.expand();
            this.input.setSelectionRange(0,0);
            this.#highlightSelectedItem(this.input.value);
        }
    }


    /**
     * Provides keyboard support for the control: <br>
     * - ENTER-key takes over a new entry if the 'extendable' attribute is set. <br>
     * - If the dropdown list is displayed and an item is selected, ENTER takes over the item. <br>
     * - ARROW_UP | ARROW_DOWN applies scolling inside the list. <br>
     * - ESCAPE closes the open dropdown list. <br>
     * @param {event} evt Keydown event of the input element.
     */
    onKeydown(evt) {
        if (this.disabled) return;
        const key = evt.key;
        if (this.isDropped) {
            if (key === 'Escape') this.collapse();
            if (key.includes('Arrow')) {
                evt.preventDefault();
                this.#scroll(key);
            }
            if (key === 'Enter' && this.selectedItem) {
                this.input.value = this.selectedItem.innerText;
                this.collapse();
                this.#internals.setFormValue(this.value, this.value);
            }
        } else {
            if (key === 'Enter') this.addListItem();
            if (key === 'ArrowDown') {
                this.expand();
                this.#highlightSelectedItem(this.input.value);
            }
        }
        if (key === 'Delete') this.input.value = '';
    }


    /**
     * Takes over the active list-item in the input field.
     */
    onItemClick(evt) {
        if (evt.target.nodeName === 'LI') {
            this.input.value = evt.target.innerText;
            this.#internals.setFormValue(this.value, this.value);
            this.collapse();
            this.input.blur();
        }
    }


    /**
     * Displays the selected item and synchronisizes the list-index.
     */
    onMouseHover(evt) {
        if (evt.target.nodeName !== 'LI') return; // ignore the cross!
        if (this.selectedItem) this.selectedItem.removeAttribute('selected');
        evt.target.setAttribute('selected','');
        const list = this.shadowRoot.querySelectorAll('li.jom-list-item');
        this.#listindex = -1;
        do {
            this.#listindex++;
        } while (!list[this.#listindex].hasAttribute('selected'));
    }

    /**
     * Enables or disables either the dropdown arrow or the plus symbol.
     * type == 'false' indicates that no button is displayed.
     * @param {string | boolean} type The button to be displayed or disabled.
     */
    showButton(type) {
        const arrow = this.getElement('divArrow'),
              plus = this.getElement('divPlus');
        if (!(arrow && plus)) return;
        if (type === 'arrow') {
            arrow.removeAttribute('hidden');
            plus.setAttribute('hidden','');
        } else if (type === 'plus') {
            plus.removeAttribute('hidden');
            arrow.setAttribute('hidden','');
        } else if (type === false) {
            arrow.setAttribute('hidden','');
            plus.setAttribute('hidden','');
        }
    }


    /**
     * Shows the dropdown list.<br>
     * The method is called either by click on the arrow button
     * or by input in the field.
     * @param {string | string[]} options String array of options to be displayed in the dropdown list.
     */
    expand(options = this.#options) {
        this.collapse();
        this.isDropped = (options.length > 0);
        const items = (this.sorted) ? options.sort() : options;
        for (let i = 0; i < items.length; i++) {
            const item = document.createElement('li');
            let cross;
            if (this.extendable && this.type === 'combo') {
                cross = document.createElement('div');
                cross.append(TMP_CLOSE.content.cloneNode(true));
                this.setAttributes(cross, {"data-index": i, class: "combo-delete"});
                cross.addEventListener('click', (evt) => this.removeListItem(evt));
            }
            item.className = 'jom-list-item';
            item.innerText = items[i];
            if (cross) item.appendChild(cross);
            item.addEventListener('click', (evt) => this.onItemClick(evt));
            item.addEventListener('pointermove', (evt) => this.onMouseHover(evt));
            this.list.appendChild(item);
            if (i >= this.size - 1 && !this.list.classList.contains('scroll')) {
                const height = item.clientHeight * this.size + 1;
                this.list.classList.add('scroll');
                this.setAttributes(this.list, {style: `max-height: ${height}px;`});
            }
        }
    }


    /**
     * Closes the dropdown list and set's the flag 'isDropped' to false.
     */
    collapse() {
        this.list.innerHTML = '';
        this.list.classList.remove('scroll');
        this.isDropped = false;
    }


    /**
     * Imports a CSS stylesheet with the specific attribute: "data-control".
     * Since the parameter can be changed, any other flag can be used as marker
     * for the component to recognize the wanted stylesheet.
     * @param {string} selector An attribute given in the stylesheet link
     * to recognize it for this component.
     */
    importStyleSheet(selector = 'link[data-control]') {
        const link = document.querySelector(selector);
        if (link) this.shadowRoot.innerHTML += link.outerHTML;
    }


    /**
     * Private method.<br>
     * Highlightes the current selected item after expanding the dropdown list.
     */
    #highlightSelectedItem(item) {
        if (item == '') return;
        const list = this.shadowRoot.querySelectorAll('li.jom-list-item');
        this.#listindex = this.#options.indexOf(item);
        if (this.#listindex > -1) {
            list[this.#listindex].scrollIntoView({block: 'center'});
            list[this.#listindex].setAttribute('selected','');            
        }
    }

    /**
     * Creates the component's child elements:<br>
     * - div (wrapper)
     * - imput element
     * - ul element (droplist)
     * - drop arrow (svg-image)
     * - plus sign (svg-image)
     */
    #createChildren() {
        const wrapper = document.createElement('div'),
              input = document.createElement('input'),
              list = document.createElement('ul');
        this.setAttributes(wrapper, {id: 'divCombo', class: 'jom-combo'});
        this.setAttributes(input, {type: 'text', id: 'inpCombo', class: 'jom-input', autocomplete: 'off'});
        this.setAttributes(list, {id: 'lstCombo', class: 'cbo-list'});        
        wrapper.append(input, list,
                       TMP_PLUSSIGN.content.cloneNode(true),
                       TMP_ARROW.content.cloneNode(true));
        this.shadowRoot.append(wrapper, TMP_COMBOSTYLE.content.cloneNode(true));
    }


    /**
     * Scrolls the list up or down.
     * @param {string} key Arrowdown | ArrowUp
     */
    #scroll(key) {
        const list = this.shadowRoot.querySelectorAll('li.jom-list-item'),
              step = (key === 'ArrowDown') ? 1 : -1,
              bound = (key === 'ArrowDown') ? 0 : list.length - 1;
        this.#listindex += step;
        if (this.selectedItem) {
            this.selectedItem.removeAttribute('selected');
            if (this.#listindex < 0 || this.#listindex >= list.length) this.#listindex = bound;
        } else {
            this.#listindex = bound;
        }
        list[this.#listindex].setAttribute('selected','');
        list[this.#listindex].scrollIntoView({block: 'center'});
    }


    /**
     * Updates all HTML-given attributes after connectedCallback!
     */
    #updateProperties() {
        Object.values(this.properties).forEach((prop) => {
            if (Combobox.prototype.hasOwnProperty(prop)) {
                let value = this[prop];
                delete this[prop];
                this[prop] = value;
            }
        });
    }


    /**
     * Helper function to set one ore more attributes to a single element.
     * @param {HTMLElement} element Element the attributes to be set on.
     * @param {object} attributes Object of attributes and values: {id: 'divID', class: 'active'} etc.
     */
    setAttributes(element, attributes) {
        Object.keys(attributes).forEach(attr => {
            element.setAttribute(attr, attributes[attr]);
        });
    }


    /**
     * Helper function that returns the shadow root element with the given id or 'null' if not found.
     * @param {string | null} id The id of the wanted child element from shadow root.
     * @returns HTML-element.
     */
    getElement(id) {
        return this.shadowRoot.getElementById(id);
    }


    /**
     * Converts some specific epressions to Boolean.
     * @param {any} expression The expression to be checked for true or false
     * @returns true | false
     */
    toBoolean(expression) {
        if (expression === false || expression === true) return expression;
        if (typeof expression === 'string') {
            expression = expression.toLowerCase().trim();
            switch(expression) {
                case 'true':
                case 'yes':
                case 'on':
                case '1':
                    return true;
                case 'false':
                case 'no':
                case 'off':
                case '0':
                case '':
                    return false;
                default:
                    return JSON.parse(expression);
            }
        } else {
            return Boolean(expression);
        }
    }
}

customElements.define('combo-box', Combobox);