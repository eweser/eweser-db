import { StyleSheet } from 'react-native';

const background = '#373d5e';
const backgroundDark = '#2b3148';
const highlight = 'green';
const secondary = 'hsl(21.75, 34.78%, 45.1%)';
const secondaryDark = 'hsl(21.75, 34.78%, 35.1%)';
const white = '#ffffff';

export default StyleSheet.create({
  appRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: background,
    paddingVertical: 3,
    paddingHorizontal: 1,
  },
  roomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  newNoteButton: {
    color: white,
    backgroundColor: highlight,
    padding: 1,
    marginLeft: 'auto',
  },
  shareButton: {
    color: white,
    backgroundColor: secondary,
    padding: 1,
    marginLeft: 1,
  },
  card: {
    backgroundColor: white,
    width: 400,
    margin: 32,
    alignSelf: 'center',
  },
  cardInner: {
    padding: 1,
  },
  editor: {
    padding: 1,
    paddingTop: 2,
  },
  flexWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  login: {
    flexDirection: 'column',
    width: 400,
    gap: 0.5,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  statusBar: {
    position: 'absolute',
    backgroundColor: white,
    top: 0,
    right: 0,
    left: 0,
    padding: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBarMessageDiv: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    paddingTop: 0.5,
  },
  statusBarMessage: {
    fontSize: 0.7,
    margin: 0,
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 5,
    backgroundColor: white,
    maxHeight: 'auto',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 1,
    right: 1,
    padding: 0.5,
  },
  borderedCard: {
    borderColor: 'black',
    borderWidth: 1,
    padding: 1,
    margin: 1,
  },
  loginButton: {
    backgroundColor: 'transparent',
    color: secondary,
  },
  loginButtonHover: {
    color: secondaryDark,
  },
  loginButtonText: {
    fontSize: 1.5,
    fontWeight: 'bold',
    marginRight: 1,
  },
  loginButtonTextSmall: {
    fontSize: 1,
    fontWeight: 'bold',
    marginRight: 0.7,
  },
  logoutButtonsDiv: {
    flexDirection: 'row',
    padding: 0,
    margin: 0,
    alignItems: 'baseline',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    color: secondary,
    marginBottom: 1,
    marginTop: 1,
  },
});
