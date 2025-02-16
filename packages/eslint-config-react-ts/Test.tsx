import { HTMLAttributeAnchorTarget } from 'react'; // only used as type should throw
const App = () => {
  const unused: HTMLAttributeAnchorTarget = 'asdf'; // yay works

  const functionTest = (unusedParam = 1) => {
    console.log('logs not allowed');
  };

  return (
    <div>
      <h1>hi</h1>
    </div>
  );
};

export default App;
