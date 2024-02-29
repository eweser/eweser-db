import { EweserIcon } from './EweserIcon';
import { useHover } from './helpers';
import { styles } from './styles';

export const LoginButton = ({
  loginUrl,
  size = 'small',
}: {
  loginUrl: string;
  size?: 'small' | 'large';
}) => {
  const style = useHover(styles.loginButtonHover, styles.loginButton);
  const textStyle =
    size === 'small' ? styles.loginButtonTextSmall : styles.loginButtonText;
  const logoSize = size === 'small' ? 25 : 35;
  const logoSizing = {
    width: logoSize,
    height: logoSize,
  };
  const loginButtonText = size === 'small' ? 'Login' : 'Login with Eweser';
  return (
    <a
      href={loginUrl}
      style={{
        textDecoration: 'none',
      }}
    >
      <button {...style}>
        <p style={textStyle}>{loginButtonText}</p>
        <EweserIcon {...logoSizing} />
      </button>
    </a>
  );
};
