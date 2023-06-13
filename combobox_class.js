const TMP_COMBOSTYLE = document.createElement('template'),
      TMP_PLUSSIGN = document.createElement('template'),
      TMP_ARROW = document.createElement('template'),
      inpID = 'inpCombo'; // keep the main id on one place!

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

        .svg-arrow, .svg-plus {
            position: absolute;
            top: 2px;
            right: 1px;
            cursor: pointer;
            z-index: 9999;
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
            background-color: #0075ff;
        }
        
        :host[hidden], [hidden] {
            display: none;
        }
    </style>`;

TMP_PLUSSIGN.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg"
        id="svgPlus"
        class="svg-plus"    
        viewBox="0 0 200 200"
        stroke-width="20"
        stroke="#0075ff" hidden>
        <path d="M40 100 h120 M100 40 v120z"/>
    </svg>`;

TMP_ARROW.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg"
        id="svgArrow"
        class="svg-arrow"
        viewBox="0 0 100 100" 
        fill="#0075ff" hidden>
        <path d="M20 35 l30 30 l30-30z"/>
    </svg>`;

class Combobox extends HTMLElement {
    #size = 6;
    #dropped = false;
    #accentColor = '#0075ff'; // "#000000C0" (gray)
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
        //https://stackoverflow.com/questions/39310890/get-all-static-getters-in-a-class
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
        if (!(newOpts instanceof Array)) newOpts = newOpts.split(',');
        this.#options = newOpts.map(opt => opt.trim());
        if (this.#options.length == 0) {
            this.showButton(false);
            return;
        }        
        const attrOpts = this.#options.join(','),
              button = this.value.length > 0 && !this.#options.includes(this.value) ? 'plus' : 'arrow';
        this.showButton(button);
        if (!this.hasAttribute('options')) this.setAttribute('options', attrOpts);
    }


    /**
     * Returns or determines wether the dropdown list can be extended by new entries.
     * If property is 'true' or the corresponding HTML attribute is set,
     * a new entry can be added by pressing the enter key or clicking the + symbol
     * that appears on the right side of the control.
     */
    get extendable() { return this.hasAttribute('extendable'); }
    set extendable(flag) {
        if (this.isBoolean(flag)) {
            if(!this.hasAttribute('extendable')) this.setAttribute('extendable','');
        } else {
            this.removeAttribute('extendable');
            this.getElement('svgPlus').setAttribute('hidden','');
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
        const input = this.getElement(inpID);
        return input ? input.value : '';
    }
    set value(newVal) { 
        if (!this.hasAttribute('value') && newVal !== '') this.setAttribute('value', newVal);
        const input = this.getElement(inpID),
              plus = this.getElement('svgPlus');
        if (input) input.value = newVal;
        if (this.extendable && newVal !== '') {
            if (!this.#options || !this.#options.includes(newVal)) {
                if (plus) this.showButton('plus');
            }
        }
    }


    /**
     * Returns or sets the name attribute.
     */
    get name() { return this.getElement(inpID).name; }
    set name(newName) {
        if (!this.hasAttribute('name')) this.setAttribute('name', newName);
        const input = this.getElement(inpID);
        if (input) input.name = newName;
    }


    /**
     * Supplies the placeholder attribute to the internal input field.
     */
    get placeholder() { return this.hasAttribute('placeholder') ? this.getAttribute('placeholder') : ''; }
    set placeholder(newVal) {
        const input = this.getElement(inpID);
        if (input) input.placeholder = newVal;
        if (!this.hasAttribute('placeholder')) this.setAttribute('placeholder', newVal);
    }


    /**
     * Tells us, if the dropdown list is open or closed
     * and toggles the arrow button on the right side.
     */
    get isDropped() { return this.#dropped; }
    set isDropped(flag) {
        this.#dropped = this.isBoolean(flag);
        const arrow = this.getElement('svgArrow');
        if (this.#dropped) {
            // arrow.classList.add('jom-arrow-up');
            arrow.setAttribute('transform','scale(-1 -1)');
        } else {
            // arrow.classList.remove('jom-arrow-up');
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
     * Returns or assignes the accent color for the control.
     * Value can be assigned by CSS or JavaScript. 
     * Default value is '#0075ff' from Chrome or Firefox.
     */
    get accentColor() {
        const accColor = getComputedStyle(this.getElement(inpID)).getPropertyValue('accent-color');
        return accColor === 'auto' ? this.#accentColor : accColor;
    }
    set accentColor(color) {
        if (!CSS.supports('color', color)) return;
        this.#accentColor = color;
        const arrow = this.getElement('svgArrow'),
              plus = this.getElement('svgPlus');
        if (arrow) arrow.setAttribute('fill', color);
        if (plus) plus.setAttribute('stroke', color);
    }


    /**
     * Returns a list of attributes to be observed. <br>
     * Any attribute contained in this list will trigger the attributeChangedCallback method.
     * @see #{@link attributeChangedCallback} 
     * @readonly
     */
    static get observedAttributes() {
        return ['options','size', 'value','name','extendable','sorted','placeholder'];
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
        this.importStyleSheet();
        this.onArrowClick = this.onArrowClick.bind(this);
        this.onInput = this.onInput.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.addListItem = this.addListItem.bind(this);
        this.#internals = this.attachInternals();
    }


    /**
     * Method is automatically called when the component is connected to the DOM.
     * Right moment to add event listeners and updating HTML attributes.
     */
    connectedCallback() {
        this.#createChildren();
        this.#updateProperties();
        const input = this.getElement(inpID),
              arrow = this.getElement('svgArrow'),
              plus = this.getElement('svgPlus'),
              size = `${input.clientHeight}px`;
        this.setAttributes(plus, {height: size, width: size});
        this.setAttributes(arrow, {height: size, width: size});
        plus.addEventListener('click', this.addListItem);
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
        const input = this.getElement(inpID),
              arrow = this.getElement('svgArrow'),
              plus = this.getElement('svgPlus');
        plus.removeEventListener('click', this.addListItem);
        input.removeEventListener('input', this.onInput);
        input.removeEventListener('keydown', this.onKeydown);
        arrow.removeEventListener('click', this.onArrowClick);
        this.removeEventListener('blur', this.dropdownCollapse);
    }


    /**
     * @description This method is called when an attribute has been changed,
     * is new assigned or when an HTML-element is connected to the DOM. <br>
     * The attribute must be listed in the observedAttributes property.
     * @see #{@link observedAttributes}<br>
     * 
     * For example: &lt INPUT name="surname" &gt would trigger this method.
     * If the attribute's value has not been changed, the function returns immediately.
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
        if (attrName == 'placeholder') this.placeholder = newVal;
        if (attrName == 'extendable') this.extendable = this.hasAttribute('extendable') ? true : false;
        if (attrName == 'sorted') this.sorted = this.hasAttribute('sorted') ? true : false;
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
        const searchFor = evt.target.value.toLowerCase(), 
              arrMatches = [],
              plus = this.getElement('svgPlus');
        this.dropdownCollapse();
        this.showButton(false);
        if (searchFor.length == 0) {
            if (this.options) this.showButton('arrow');
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
        this.showButton('arrow');
        this.dropdownShow(arrMatches);        
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
        this.dropdownCollapse();
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
     * Provides keyboard support for the control: <br>
     * - ENTER-key takes over a new entry if the 'extendable' attribute is set. <br>
     * - If the dropdown list is displayed and an item is selected, ENTER takes over the item. <br>
     * - ARROW_UP | ARROW_DOWN applies scolling inside the list. <br>
     * - ESCAPE closes the open dropdown list. <br>
     * @param {event} evt Keydown event of the input element.
     */
    // TODO implementing DEL-key to delete an item! 
    // ==> also adding an X-button on each item to support mouse events and mobile devices.
    onKeydown(evt) {    
        const key = evt.key;
        if (key == 'Enter') {
            if (!this.isDropped) {
                this.addListItem();
            } else if (this.selectedItem) {
                this.getElement(inpID).value = this.selectedItem.innerText;
                this.dropdownCollapse();
                this.#internals.setFormValue(this.value, this.value);
            }
        } 
        if (this.isDropped) {
            if (key == 'Escape') this.dropdownCollapse();
            if (key.includes('Arrow')) {
                evt.preventDefault();
                this.#scroll(key);
                
            }             
        }       
    }


    /**
     * Takes over the active list-item in the input field.
     */
    onItemClick(evt) {
        this.getElement(inpID).value = evt.target.innerText;
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
     * Enables or disables either the dropdown arrow or the plus symbol.
     * type == 'false' indicates that no button is displayed.
     * @param {string | boolean} type The button to be displayed or disabled.
     */
    showButton(type) {
        const arrow = this.getElement('svgArrow'),
              plus = this.getElement('svgPlus');
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
                const height = item.clientHeight * this.size;
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
     * - drop arrow (svg-image)
     * - plus sign (svg-image)
     */
    #createChildren() {
        const wrapper = document.createElement('div'),
              input = document.createElement('input'),
              list = document.createElement('ul');
        this.setAttributes(wrapper, {id: 'divCombo', class: 'jom-combo'});
        this.setAttributes(input, {type: 'text', id: inpID, class: 'jom-input', autocomplete: 'off'});
        this.setAttributes(list, {id: 'lstCombo', class: 'cbo-list'});        
        wrapper.append(input, list,
                       TMP_PLUSSIGN.content.cloneNode(true),
                       TMP_ARROW.content.cloneNode(true));
        this.shadowRoot.append(wrapper,TMP_COMBOSTYLE.content.cloneNode(true));
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
     * Checks if a given expression is true or false.
     * @param {any} expression The expression to be checked for true or false
     * @returns true | false
     */
    isBoolean(expression) {
        if (expression === true || expression === false) return expression;
        switch(expression?.toLowerCase()?.trim()) {
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