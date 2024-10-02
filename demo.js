const combo = document.getElementById('jomCombo');
const arrCountries = ['Uruguay','   Germany  ','United Kingdom','France   ','  Italy  ',
    'Greece','United States','Uganda','Portugal','Poland','Pakistan','Peru','Argentina'];

runApp();

function runApp() {
    // For testing remove the comments:
    // combo.options = arrCountries;
    // combo.addListItem('Mexico');
    // combo.value = 'Egypt';
    // combo.accentColor = 'red';

    // Add the event listeners to the demo controls:
    document.getElementById('inpSize').addEventListener('input', function() {
        combo.setAttribute('size', this.value);
    })
    document.getElementById('chkSorted').addEventListener('change', function() {
        combo.sorted = this.checked;
        if (combo.isDropped) combo.expand();
    })
    document.getElementById('chkAllowAdd').addEventListener('change', function() {
        combo.extendable = this.checked;
        combo.collapse();
    })

    document.getElementsByName('combo-type').forEach(opt => {
        opt.addEventListener('input', function() {
            combo.setAttribute('type', this.value);
            combo.collapse();
        });        
    })

    document.getElementById('inpSize').value = combo.size;
    combo.addListItem('Mexico');
}