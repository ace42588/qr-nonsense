import { useInputs, useDerivedQRData, useInputDispatch } from "../state";

const levels = [
  { label: "Low (L) – 7% redundancy", value: 0 },
  { label: "Medium (M) – 15% redundancy", value: 1 },
  { label: "Quartile (Q) – 25% redundancy", value: 2 },
  { label: "High (H) – 30% redundancy", value: 3 },
];

const versions = [{ label: "Auto", value: -1 }].concat(
  Array.from({ length: 40 }, (_, i) => ({
    label: `Version ${i + 1}`,
    value: i + 1,
  }))
);

const masks = [
  { label: "Auto", value: -1 },
  { label: "Mask 0", value: 0 },
  { label: "Mask 1", value: 1 },
  { label: "Mask 2", value: 2 },
  { label: "Mask 3", value: 3 },
  { label: "Mask 4", value: 4 },
  { label: "Mask 5", value: 5 },
  { label: "Mask 6", value: 6 },
  { label: "Mask 7", value: 7 },
  { label: "None", value: null },
];

export function FormatInput() {
  const { errorCorrectionLevel, version, dataMask } = useInputs();
  const { version: cVersion, dataMask: cDataMask } = useDerivedQRData();
  const { setErrorCorrection, setVersion, setDataMask } = useInputDispatch();
  return (
    <Collapsible
      key="formatInfo"
      defaultOpen={false}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            Format Info
            <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
            <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem key="Error Correction Level">
              <SidebarMenuSubButton asChild isActive={true}>
                <select
                  id="ec-level"
                  value={errorCorrectionLevel}
                  onChange={(e) => setErrorCorrection(e.target.value)}
                >
                  {levels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
            <SidebarMenuSubItem key="QR Code Version">
              <SidebarMenuSubButton asChild isActive={true}>
                <select
                  id="qr-version"
                  value={cVersion || version}
                  onChange={(e) => setVersion(e.target.value)}
                >
                  {versions.map((ver) => (
                    <option key={ver.value} value={ver.value}>
                      {ver.label}
                    </option>
                  ))}
                </select>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
            <SidebarMenuSubItem key="Data Mask">
              <SidebarMenuSubButton asChild isActive={true}>
                <select
                  id="data-mask"
                  value={cDataMask || dataMask}
                  onChange={(e) => setDataMask(e.target.value)}
                >
                  {masks.map((mask) => (
                    <option key={mask.value} value={mask.value}>
                      {mask.label}
                    </option>
                  ))}
                </select>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
