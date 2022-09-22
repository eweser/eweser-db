import EweserDB from '@eweser/db';
import { useEffect, useRef } from 'react';

const DB = new EweserDB();

const useEweserDB = () => {
  const db = useRef(DB).current;
  useEffect(() => {
    console.log('useEweserDB updated again');
  }, []);
};

export default useEweserDB;
