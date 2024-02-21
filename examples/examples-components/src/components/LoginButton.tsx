import { EweserIcon } from './EweserIcon';
import { useHover } from './helpers';
import { styles } from './styles';

export const LoginButton = ({ loginUrl }: { loginUrl: string }) => {
  const style = useHover(styles.loginButtonHover, styles.loginButton);
  return (
    <a
      href={loginUrl}
      style={{
        textDecoration: 'none',
      }}
    >
      <button {...style}>
        <p>Login</p>
        <EweserIcon width={30} height={40} />
      </button>
    </a>
  );
};
