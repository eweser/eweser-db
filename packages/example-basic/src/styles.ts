export const styles: {
  [key: string]: React.HTMLAttributes<HTMLDivElement>['style'];
} = {
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
  flexColCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 'auto',
  },
};
