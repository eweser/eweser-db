import { type CSSProperties } from 'react';

const appRoot: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0',
  color: 'white',
  backgroundColor: '#373d5e',
  minHeight: '100vh',
};
const card: CSSProperties = {
  backgroundColor: 'white',
  color: 'black',
  width: '400px',
  boxShadow: '4px 3px 5px 2px green',
  margin: '32px auto',
  padding: '32px',
  cursor: 'pointer',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
};
const flexWrap: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  columnGap: '1rem',
};
const editor: CSSProperties = { width: '90%', minHeight: '150px' };
const login: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '400px',
  rowGap: '0.5rem',
};
const deleteButton: CSSProperties = { position: 'absolute', top: 8, right: 8 };
const statusBar: CSSProperties = {
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
  alignContent: 'center',
};
const statusBarMessage: CSSProperties = {
  fontSize: '0.7rem',
  marginTop: 'auto',
};
const modal: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  height: '100%',
  width: '100%',
};
const modalContent: CSSProperties = {
  position: 'relative',
  padding: '5rem',
  background: 'white',
  display: 'flex',
  flexWrap: 'wrap',
  overflowY: 'auto',
  maxHeight: '80vh',
};
const modalCloseButton: CSSProperties = {
  position: 'absolute',
  top: '1rem',
  right: '1rem',
};
const borderedCard: CSSProperties = {
  border: '1px solid black',
  padding: '1rem',
  margin: '1rem',
  cursor: 'pointer',
  color: 'black',
};
const loginButton: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'hsl(21.75 34.78% 45.1%)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};
const loginButtonHover: CSSProperties = {
  ...loginButton,
  color: 'hsl(21.75 34.78% 55.1%)',
};

const loginButtonText: CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 'bold',
  marginRight: '1rem',
};

const loginButtonTextSmall: CSSProperties = {
  fontSize: '1rem',
  fontWeight: 'bold',
  marginRight: '.7rem',
};

export const styles = {
  appRoot,
  card,
  flexWrap,
  editor,
  login,
  deleteButton,
  statusBar,
  statusBarMessage,
  modal,
  modalContent,
  modalCloseButton,
  borderedCard,
  loginButton,
  loginButtonHover,
  loginButtonText,
  loginButtonTextSmall,
};
