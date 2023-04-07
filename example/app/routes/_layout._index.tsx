import * as React from "react";
import type { DataFunctionArgs } from "@remix-run/node";
import { defer, redirect } from "@remix-run/node";
import {
  Await,
  Form,
  Link,
  useAsyncValue,
  useLoaderData,
} from "@remix-run/react";

import { sessionStorage } from "~/session.server";

export async function loader({ request, context }: DataFunctionArgs) {
  let cookie = request.headers.get("Cookie");
  let session = await sessionStorage.getSession(cookie);
  let name = new Promise<string>((resolve) =>
    setTimeout(() => resolve(session.get("name") || "Anonymous"), 1_000)
  );

  return defer({
    name,
    loadContextName: context.loadContextName,
  });
}

export async function action({ request }: DataFunctionArgs) {
  let cookie = request.headers.get("Cookie");
  let session = await sessionStorage.getSession(cookie);
  let formData = await request.formData();

  let name = formData.get("name");

  if (formData.has("reset")) {
    session.unset("name");
    return redirect("/", {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      },
    });
  }

  if (!name) {
    throw new Response("Name is required", { status: 400 });
  }

  session.set("name", name);

  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export default function Index() {
  let data = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>
        Welcome to{" "}
        <a
          target="_blank"
          rel="noreferrer nofollow noopener"
          href="https://remix.run"
        >
          Remix
        </a>{" "}
        running on{" "}
        <a
          target="_blank"
          rel="noreferrer nofollow noopener"
          href="https://fastify.io"
        >
          Fastify
        </a>
      </h1>

      <React.Suspense fallback={<h2>loading...</h2>}>
        <Await resolve={data.name} errorElement={<h2>failed...</h2>}>
          {(resolvedName) => (
            <h2>
              Hello {resolvedName}, with context name {data.loadContextName}
            </h2>
          )}
        </Await>
      </React.Suspense>

      <Form
        method="post"
        style={{ display: "flex", justifyContent: "center", gap: 4 }}
      >
        <label>
          <span>Name: </span>
          <React.Suspense fallback={<FallbackNameInput />}>
            <Await resolve={data.name}>
              <NameInput />
            </Await>
          </React.Suspense>
        </label>
        <button type="submit">Submit</button>
        <button name="reset" type="submit">
          Reset
        </button>
      </Form>

      <div style={{ marginTop: 10, display: "block" }}>
        <Link to="/page-2">Go to page 2</Link>
      </div>
    </div>
  );
}

function NameInput() {
  let resolvedName = useAsyncValue() as string;
  let defaultValue = resolvedName === "Anonymous" ? "" : resolvedName;
  return <input type="text" name="name" defaultValue={defaultValue} />;
}

function FallbackNameInput() {
  // axe-ignore
  return <input type="text" name="name" />;
}
