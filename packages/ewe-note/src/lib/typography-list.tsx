/**
 * supply with a list of <li> elements like @example <><li>item 1</li><li>item 2</li></>
 */
export default function List({ children }: { children: React.ReactNode }) {
  return <ul className="my-6 ml-6 list-disc [&>li]:mt-2">{children}</ul>;
}
