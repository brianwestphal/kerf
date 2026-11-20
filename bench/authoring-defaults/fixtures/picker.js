import './picker.css';
export const options = ['Apricot', 'Blueberry', 'Cherry'];
export function commit(value) {
  window.commits.push(value);
}
export function exposePicker(mount) {
  window.commits = [];
  let stop;
  window.step = (operation) => {
    if (operation === 'mount') stop = mount(document.querySelector('main'));
    else if (operation === 'dispose') {
      stop();
      stop = undefined;
    } else throw new Error('Unknown operation ' + operation);
  };
}
