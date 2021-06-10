import React from "react";
import CanisterPage from "../components/CanisterPage";
import { CanistersTable } from "../components/CanistersTable";
import { MetaTitle } from "../components/MetaTags";

const Canisters = () => {
  const title = "Canisters";

  return (
    <CanisterPage>
      <MetaTitle title={title} />
      <h1 className="text-3xl mb-8">{title}</h1>
      <CanistersTable />
    </CanisterPage>
  );
};

export default Canisters;
