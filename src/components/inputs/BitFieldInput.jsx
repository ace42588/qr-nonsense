import React, { useMemo, useState, useEffect } from "react";
import { BitFieldEditor } from "./BitField/BitFieldEditor";
import { BitFieldValues } from "./BitField/BitFieldValues";
import { BitFieldVisualizer } from "./BitField/BitFieldVisualizer";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";

import { useParsedInputs } from "../../state";

export function BitFieldInput({ id, input }) {
  const { encodedBytes } = useParsedInputs()[id];

  return (
    <div>
      <Tabs defaultValue="fields" className="w-half">
        <TabsList>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="values">Values</TabsTrigger>
        </TabsList>

        <TabsContent value="fields">
          <BitFieldEditor id={id} input={input} />
        </TabsContent>

        <TabsContent value="values">
          <BitFieldValues id={id} input={input} />
        </TabsContent>
      </Tabs>

      <BitFieldVisualizer id={id} input={input} />
      <div style={{ marginTop: 8 }}>
        {encodedBytes ? (
          <>
            <b>Encoded Bytes:</b> {encodedBytes}
          </>
        ) : (
          <span style={{ color: "red" }}>(missing or invalid values)</span>
        )}
      </div>
    </div>
  );
}
