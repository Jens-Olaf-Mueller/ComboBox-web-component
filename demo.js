const combo = document.getElementById('jomCombo');
const size = document.getElementById('inpSize');
const sorted = document.getElementById('chkSorted');
const extendable = document.getElementById('chkAllowAdd');

runApp();
function runApp() {
    // combo.options = 'Uruguay, Germany, United Kingdom, France, Italy, Greece, United States, Uganda,Portugal, Poland, Pakistan, Peru';
    // combo.value = 'Italy';
    size.addEventListener('input', function() {
        combo.setAttribute('size',this.value);
    })
    sorted.addEventListener('change', function() {
        if (this.checked) {
            combo.setAttribute('sorted', '');
        } else {
            combo.removeAttribute('sorted');
        }
    })
    
    extendable.addEventListener('change', function() {
        if (this.checked) {
            combo.setAttribute('extendable', '');
        } else {
            combo.removeAttribute('extendable');
        }        
    })
}