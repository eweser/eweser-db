export const styles: { [key: string]: React.HTMLAttributes<HTMLDivElement>['style'] } = {
  card: {
    width: '400px',
    boxShadow: '0px 0px 10px 3px #dddd',
    margin: '32px',
    padding: '32px',
    cursor: 'pointer',
  },
  flexWrap: { display: 'flex', flexWrap: 'wrap' },
  editor: { width: '100%', minHeight: '150px' },
  login: { display: 'flex', flexDirection: 'column', width: '400px' },
};
