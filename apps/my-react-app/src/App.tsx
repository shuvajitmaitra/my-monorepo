import { formatDate, slugify } from "@mono/utils";
import "./App.css";
import { useEffect, useState } from "react";

type User = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

async function getUser(id: number): Promise<User> {
  const res = await fetch(`http://localhost:4000/api/users/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch user ${id}`);
  const json = (await res.json()) as { data: User };
  console.log("json.data", JSON.stringify(json.data, null, 2));
  return json.data;
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getUser(1).then(setUser).catch(console.error);
  }, []);

  return (
    <div className="">
      <p>Hello</p>
      <p>{slugify("Hello World")}</p>
      <p>{formatDate(new Date())}</p>
      {user && (
        <div>
          <p>{user.name}</p>
          <p>{user.email}</p>
          <p>{formatDate(new Date(user.createdAt))}</p>
        </div>
      )}
    </div>
  );
}

export default App;
