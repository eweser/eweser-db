export const styles: {
  [key: string]: React.HTMLAttributes<HTMLDivElement>['style'];
} = {
  appRoot: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 'auto',
  },
  card: {
    width: '400px',
    boxShadow: '0px 0px 10px 3px #dddd',
    margin: '32px auto',
    padding: '32px',
    cursor: 'pointer',
    position: 'relative',
  },
  flexWrap: { display: 'flex', flexWrap: 'wrap', columnGap: '1rem' },
  editor: { width: '90%', minHeight: '150px' },
  login: {
    display: 'flex',
    flexDirection: 'column',
    width: '400px',
    rowGap: '0.5rem',
  },
  deleteButton: { position: 'absolute', top: 8, right: 8 },
  statusBar: {
    position: 'fixed',
    backgroundColor: 'rgb(255 255 255 / 90%)',
    bottom: '0',
    right: 0,
    left: 0,
    zIndex: 2,
    padding: '0 1rem',
    color: 'rgb(82 82 82)',
    display: 'flex',
    justifyContent: 'space-between',
  },
};
