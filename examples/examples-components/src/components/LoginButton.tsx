export const LoginButton = ({ loginUrl }: { loginUrl: string }) => {
  return (
    <a href={loginUrl}>
      <button>
        Login
        <img src="/eweser-db-logo-small.svg" />
      </button>
    </a>
  );
};
