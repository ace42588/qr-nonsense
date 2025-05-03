import React, { useState } from "react";
import BitFieldSection from "./BitFieldSection";

export default function OrderBitFieldEditor({ title, initialFields, initialValues }) {
  const [fields, setFields] = useState(initialFields);

  const [sample, setSample] = useState(initialValues);


  return (
    <BitFieldSection
        title={title}
        fields={fields}
        setFields={setFields}
        sampleValues={sample}
      />
    );
}