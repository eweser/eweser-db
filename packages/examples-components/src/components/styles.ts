import { type CSSProperties } from 'react';

const background = '#373d5e';
const backgroundDark = '#2b3148';
const highlight = 'green';
const secondary = 'hsl(21.75 34.78% 45.1%)';
const secondaryDark = 'hsl(21.75 34.78% 35.1%)';
const white = '#ffffff';

export const appRoot: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0',
  color: white,
  backgroundColor: background,
  minHeight: '100vh',
  paddingLeft: '1rem',
  paddingRight: '1rem',
  paddingTop: '3rem',
};
export const roomBar: CSSProperties = {
  display: 'flex',
  alignContent: 'center',
  width: '100%',
};
export const newNoteButton: CSSProperties = {
  color: white,
  background: highlight,
  boxShadow: `5px 2px 5px 2px ${backgroundDark}`,
  border: 'none',
  padding: '0.75em',
  margin: 'auto',
  marginRight: '0',
  marginLeft: 'auto',
  cursor: 'pointer',
};
export const shareButton: CSSProperties = {
  color: white,
  background: secondary,
  boxShadow: `5px 2px 5px 2px ${backgroundDark}`,
  border: 'none',
  padding: '0.75em',
  margin: 'auto',
  marginRight: '0',
  marginLeft: '2rem',
  cursor: 'pointer',
};
export const card: CSSProperties = {
  backgroundColor: white,
  color: 'black',
  width: '400px',
  boxShadow: `4px 3px 5px 2px ${highlight}`,
  margin: '32px auto',
  cursor: 'pointer',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
};
export const cardInner: CSSProperties = {
  padding: '1rem',
};
export const editor: CSSProperties = {
  padding: '1rem',
  paddingTop: '2rem',
};
export const flexWrap: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  columnGap: '1rem',
};
export const login: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '400px',
  rowGap: '0.5rem',
};
export const deleteButton: CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 8,
};
export const statusBar: CSSProperties = {
  position: 'fixed',
  backgroundColor: white,
  top: 0,
  right: 0,
  left: 0,
  zIndex: 2,
  padding: '0 1rem',
  color: background,
  display: 'flex',
  justifyContent: 'space-between',
  alignContent: 'center',
};

export const statusBarMessageDiv: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'end',
  paddingTop: '0.5rem',
  lineHeight: '1rem',
};
export const statusBarMessage: CSSProperties = {
  fontSize: '0.7rem',
  margin: 0,
};
export const modal: CSSProperties = {
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
export const modalContent: CSSProperties = {
  position: 'relative',
  padding: '5rem',
  background: white,
  color: 'black',
  display: 'flex',
  flexWrap: 'wrap',
  overflowY: 'auto',
  maxHeight: '80vh',
  zIndex: 1001,
};
export const modalCloseButton: CSSProperties = {
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  border: 'none',
  padding: '0.5rem',
  cursor: 'pointer',
};
export const borderedCard: CSSProperties = {
  border: '1px solid black',
  padding: '1rem',
  margin: '1rem',
  cursor: 'pointer',
  color: 'black',
};
export const loginButton: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: secondary,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};
export const loginButtonHover: CSSProperties = {
  ...loginButton,
  color: secondaryDark,
};

export const loginButtonText: CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 'bold',
  marginRight: '1rem',
};

export const loginButtonTextSmall: CSSProperties = {
  fontSize: '1rem',
  fontWeight: 'bold',
  marginRight: '.7rem',
};

export const logoutButtonsDiv: CSSProperties = {
  display: 'flex',
  padding: '0rem',
  margin: 0,
  alignItems: 'baseline',
};

export const logoutButton: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: secondary,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  marginBottom: '1rem',
  textDecoration: 'underline',
  marginTop: '1rem',
};
