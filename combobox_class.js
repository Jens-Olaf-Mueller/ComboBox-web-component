const TMP_COMBOSTYLE = document.createElement('template');
const _ID = 'inpCombo'; // keep the main id on one place!
TMP_COMBOSTYLE.innerHTML = `
    <style>
        :host {
            display: inline-block;
            height: 100%;
        }

        #divCombo.jom-combo {
            height: 100%;
            display: inline-block;
            position: relative;
        }

        #inpCombo.jom-input {
            font-size: inherit;
        }

        #divCombo.extended-list::after {
            display: block;
            content: '';
            position: absolute;
            top: 2px;
            right: -20px;
            width: 24px;
            height: 24px;
            background: linear-gradient(#008000 0 0), 
                        linear-gradient(#008000 0 0);
            background-position: center;
            background-size: 50% 3px,3px 50%;
            background-repeat: no-repeat;
        }

        #divArrow.jom-arrow-down {
            position: absolute;
            margin: 4px;
            width: 7px;
            height: 7px;
            right: 4px;
            top: 8px;
            border-bottom: 2px solid rgba(0, 0, 0, 0.5);
            border-right: 2px solid rgba(0, 0, 0, 0.5);
            transform: translate(0, -50%) rotate(45deg);
            cursor: pointer;
            z-index: 9999;
        }

        #divArrow.jom-arrow-up {
            top: 12px;
            transform: translate(0, -50%) rotate(225deg);
        } 

        .jom-combo ul {
            position: absolute;
            width: 100%;
            z-index: 999999;
            list-style: none;
            padding: unset;
            margin: unset;
            overflow-y: hidden;
        }

        .jom-combo ul.scroll {
            overflow-y: scroll;
        }

        li.jom-list-item {
            padding: 0 3px;
            border-left: 1px solid silver;
            border-right: 1px solid silver;
            background-color: field;
            cursor: pointer;
        }

        li.jom-list-item:last-child {
            border-bottom: 1px solid silver;
        }

        li.jom-list-item[selected] {
            background-color: cornflowerblue;
        }
    </style>`;

class Combobox extends HTMLElement {
    #size = 6;
    #dropped = false;
    #listindex = -1;
    #options = null;
    #internals = null;

    /**
     * Returns or assigns the displayed list items.
     */
    get options() {
        if (this.#options) return this.#options;
        if (this.hasAttribute('options')) return this.getAttribute('options');
        return null;
    }
    set options(newOpts) {
        this.#options = newOpts.split(',').map(opt => opt.trim());
        if (this.#options.length == 0) return;
        if (!this.hasAttribute('options')) this.setAttribute('options', newOpts);
    }


    /**
     * Returns or determines wether the dropdown list can be extended by new entries.
     * If property is 'true', a new entry can be added by pressing the enter key.
     */
    get extendable() { return this.hasAttribute('extendable'); }
    set extendable(flag) {
        if (this.isBoolean(flag)) {
            if(!this.hasAttribute('extendable')) this.setAttribute('extendable','');
        } else {
            this.removeAttribute('extendable');
            this.shadowRoot.getElementById('divCombo').classList.remove('extended-list');
        }        
    }


    /**
     * Returns or determines if the displayed dropdown list is sorted.
     */
    get sorted() { return this.hasAttribute('sorted'); }
    set sorted(flag) {
        if (this.isBoolean(flag)) {
            if(!this.hasAttribute('sorted')) this.setAttribute('sorted','');
        } else {
            this.removeAttribute('sorted');
        }
    }

    /**
     * Returns or determines the count of list items.
     */
    get size() { return this.#size; }
    set size(newSize) {
        this.#size = Number(newSize);
        if (!this.hasAttribute('size')) this.setAttribute('size', newSize);
    }

    /**
     * Returns or set's the value of the combobox.
     */
    get value() { return this.shadowRoot.getElementById(_ID).value; }
    set value(newVal) { 
        if (!this.hasAttribute('value')) this.setAttribute('value', newVal);
        const input = this.shadowRoot.getElementById(_ID);
        if (input) input.value = newVal;
    }

    /**
     * Returns or sets the name attribute.
     */
    get name() { return this.shadowRoot.getElementById(_ID).name; }
    set name(newName) {
        if (!this.hasAttribute('name')) this.setAttribute('name', newName);
        const input = this.shadowRoot.getElementById(_ID);
        if (input) input.name = newName;
    }


    /**
     * Tells us, if the dropdown list is open or closed
     * and toggles the arrow button on the right side.
     */
    get isDropped() { return this.#dropped; }
    set isDropped(flag) {
        this.#dropped = this.isBoolean(flag);
        const arrow = this.shadowRoot.getElementById('divArrow');
        if (this.#dropped) {
            arrow.classList.add('jom-arrow-up');
        } else {
            arrow.classList.remove('jom-arrow-up');
        }
    }


    /**
     * Returns a reference to the component's list element.
     */
    get list() { return this.shadowRoot.getElementById('lstCombo'); }


    /**
     * Returns the current selected list item.
     */
    get selectedItem() { return this.shadowRoot.querySelector('li[selected]'); }


    /**
     * Returns a list of attributes to be observed.
     */
    static get observedAttributes() {
        return ['options','size', 'value','name','extendable','sorted'];
    }
    // static get formAssociated() { return true; }
    static formAssociated = true;

    
    /**
     * Creates a new HTML element that unites the features of the select- and the datalist-element.<br>
     * The control provides a few additional features:
     * - assigning the list as string or string array
     * - adding new entries to the list if property 'extendable' is set to 'true'
     * - setting the length of the displayed dropdown list
     * - displaying the list sorted or unsorted
     */
    constructor() {
        super();
        this.attachShadow({mode: 'open', delegatesFocus: true});
        this.importStyleSheet();
        this.onArrowClick = this.onArrowClick.bind(this);
        this.onInput = this.onInput.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.#internals = this.attachInternals();
    }


    /**
     * Method is automatically called when the component is connected to the DOM.
     * Right moment to add event listeners
     */
    connectedCallback() {
        this.#createChildren();
        const input = this.shadowRoot.getElementById(_ID),
              arrow = this.shadowRoot.getElementById('divArrow');
        input.addEventListener('input', this.onInput);
        input.addEventListener('keydown', this.onKeydown);
        arrow.addEventListener('click', this.onArrowClick);
        this.addEventListener('blur', this.dropdownCollapse);
    }


    /**
     * Method to clean up the event listeners and other stuff 
     * when the component is removed from DOM.
     */
    disconnectedCallback() { 
        const input = this.shadowRoot.getElementById(_ID),
              arrow = this.shadowRoot.getElementById('divArrow');
        input.removeEventListener('input', this.onInput);
        input.removeEventListener('keydown', this.onKeydown);
        arrow.removeEventListener('click', this.onArrowClick);
        this.removeEventListener('blur', this.dropdownCollapse);
    }

    /**
     * This method is called when an attribute has been changed or is new assigned.
     * It is also executed when an HTML-element is connected to the DOM:
     * i.e. >INPUT name="surname"< would cause that.
     * If the attribute's value has not been changed, the method returns immediately.
     * @param {string} attrName Name of the changed attribute.
     * @param {any} oldVal The old value of the attribute.
     * @param {any} newVal The new value of the attribute.
     */
    attributeChangedCallback(attrName, oldVal, newVal) {
        if (oldVal === newVal) return; // leave immediately if there are no changes!
        if (attrName == 'options') this.options = newVal;
        if (attrName == 'size') this.size = newVal;
        if (attrName == 'name') this.name = newVal;
        if (attrName == 'value') this.value = newVal;
        if (attrName == 'extendable') this.extendable = this.hasAttribute('extendable') ? true : false;
        if (attrName == 'sorted') this.sorted = this.hasAttribute('sorted') ? true : false;
    }


    /**
     * Method is called when the control is connected to a form element.
     * @param {HTMLElement} form the parent form of the control
     */
    formAssociatedCallback(form) {
        // console.log(form, new FormData(form))
    }

    /**
     * Filters, creates and displays the matching items of the list.
     * @param {event} evt The input event of the input element.
     */
    onInput(evt) {
        const searchFor = evt.target.value.toLowerCase(), 
              arrMatches = [],
              wrapper = this.shadowRoot.getElementById('divCombo');
        this.dropdownCollapse();
        wrapper.classList.remove('extended-list');
        if (searchFor.length == 0) return;
        for (let i = 0; i < this.options.length; i++) {
            const item = this.options[i];
            if (item.substring(0, searchFor.length).toLowerCase() === searchFor) {
                arrMatches.push(item);
            }
        }
        this.#internals.setFormValue(this.value, this.value);
        if (arrMatches.length == 0) {
            if(this.extendable) wrapper.classList.add('extended-list');
            this.#listindex = -1;
            return;
        }
        this.dropdownShow(arrMatches);        
    }


    /**
     * Toggles the dropdown list.
     */
    onArrowClick() {
        if (this.isDropped) {
            this.dropdownCollapse();            
        } else {
            this.dropdownShow(this.#options);            
        }
    }


    /**
     * Provides keyboard support for the control:<br>
     * - Enter takes over a new entry if the flag 'extendable' is set to 'true'.
     * - If the dropdown list is displayed and an item selected, it takes over the item.
     * - ArrowUp | ArrowDown applies scolling inside the list.
     * - Escape closes the open dropdown list.
     * @param {event} evt Keydown event of the input element.
     */
    onKeydown(evt) {    
        const key = evt.key, 
              wrapper = this.shadowRoot.getElementById('divCombo');
        if (key == 'Enter') {
            if (!this.isDropped) {
                if (this.extendable) {
                    if (!this.#options.includes(this.value)) {
                        this.#options.push(this.value);
                        wrapper.classList.remove('extended-list');
                    }
                }
            } else if (this.selectedItem) {
                this.shadowRoot.getElementById(_ID).value = this.selectedItem.innerText;
                this.dropdownCollapse();
                this.#internals.setFormValue(this.value, this.value);
            }
        } 
        if (this.isDropped) {
            if (key == 'Escape') this.dropdownCollapse();
            if (key.includes('Arrow')) this.#scroll(key);            
        }       
    }


    /**
     * Takes over the active list-item in the input field.
     */
    onItemClick(evt) {
        this.shadowRoot.getElementById(_ID).value = evt.target.innerText;
        this.#internals.setFormValue(this.value, this.value);
        this.dropdownCollapse();
    }


    /**
     * Displays the selected item and synchronisizes the list-index.
     */
    onMouseHover(evt) {
        if (this.selectedItem) this.selectedItem.removeAttribute('selected');
        evt.target.setAttribute('selected','');
        const list = this.shadowRoot.querySelectorAll('li.jom-list-item');
        this.#listindex = -1;        
        do {
            this.#listindex++;
        } while (!list[this.#listindex].hasAttribute('selected'));
    }


    /**
     * Shows the dropdown list.<br>
     * The method is called either by click on the arrow button
     * or by input in the field. 
     * @param {[string]} options String array of options to be displayed in the dropdown list.
     */
    dropdownShow(options) {
        this.dropdownCollapse();
        this.isDropped = (options.length > 0);
        const items = (this.sorted) ? options.sort() : options;
        for (let i = 0; i < items.length; i++) {
            const item = document.createElement('li');
            item.className = 'jom-list-item';
            item.innerText = items[i];
            item.addEventListener('click', (evt) => this.onItemClick(evt));
            item.addEventListener('mousemove', (evt) => this.onMouseHover(evt));
            this.list.appendChild(item);            
            if (i >= this.size - 1 && !this.list.classList.contains('scroll')) {
                const height = item.offsetHeight * this.size;
                this.list.classList.add('scroll');
                this.setAttributes(this.list, {style: `max-height: ${height}px;`});
            }
        }
    }


    /**
     * Closes the dropdown list and set's the flag 'isDropped' to false.
     */
    dropdownCollapse() {
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
     * Creates the component's child elements:<br>
     * - div (wrapper)
     * - imput element
     * - ul element (droplist)
     * - drop arrow (div)
     */
    #createChildren() {
        const wrapper = document.createElement('div'),
              arrow = document.createElement('div'),
              input = document.createElement('input'),
              list = document.createElement('ul');
        this.setAttributes(wrapper, {id: 'divCombo', class: 'jom-combo'});
        this.setAttributes(arrow, {id: 'divArrow', class: 'jom-arrow-down'});
        this.setAttributes(input, {type: 'text', id: _ID, class: 'jom-input', autocomplete: 'off'});
        this.setAttributes(list, {id: 'lstCombo', class: 'cbo-list'})
        wrapper.append(input, arrow, list);
        this.shadowRoot.append(wrapper, TMP_COMBOSTYLE.content.cloneNode(true));
    }


    /**
     * Scrolls the list up or down.
     * @param {string} key Arrowdown | ArrowUp
     */
    #scroll(key) {
        const list = this.shadowRoot.querySelectorAll('li.jom-list-item'),
              step = (key === 'ArrowDown') ? 1 : -1,
              bound = (key === 'ArrowDown') ? 0 : list.length - 1,
              flag = (key === 'ArrowDown') ? false : true;
        this.#listindex += step;
        if (this.selectedItem) {
            this.selectedItem.removeAttribute('selected');
            if (this.#listindex < 0 || this.#listindex >= list.length) this.#listindex = bound;
        } else {
            this.#listindex = bound;
        }
        list[this.#listindex].setAttribute('selected','');
        list[this.#listindex].scrollIntoView(flag);
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
     * Checks if a given expression is true or false.
     * @param {any} expression The expression to be checked for true or false
     * @returns true | false
     */
    isBoolean(expression) {
        if (expression === true || expression === false) return expression;
        switch(expression?.toLowerCase()?.trim()){
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
            case null: 
            case undefined:
                return false;
            default: 
                return JSON.parse(expression);
        }
    }
}

customElements.define('jom-combo', Combobox);