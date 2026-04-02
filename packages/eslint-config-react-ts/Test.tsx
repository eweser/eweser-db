import type { HTMLAttributeAnchorTarget } from 'react';

interface Props {
  target?: HTMLAttributeAnchorTarget;
}

const App = ({ target = '_self' }: Props) => {
  return (
    <div>
      <a href="https://example.com" target={target} rel="noreferrer">
        hi
      </a>
    </div>
  );
};

export default App;
