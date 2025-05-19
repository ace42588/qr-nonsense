const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];


<div className="label-select-checkbox-row">
          <label htmlFor="inputMode">Input Mode:</label>
          <select
            id="inputMode"
            value={mode}
            onChange={(e) => handleChange("mode", e.target.value)}
          >
            {modes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {mode === "byte" && (
            <>
              <label htmlFor="forceUtf8">Force UTF-8</label>
              <input
                id="forceUtf8"
                type="checkbox"
                checked={encoding === "utf-8"}
                onChange={(e) =>
                  handleChange(
                    "encoding",
                    e.target.checked ? "utf-8" : undefined
                  )
                }
              />
            </>
          )}
        </div>

export function QRModeSelect() {
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <ColumnsIcon />
            <span className="hidden lg:inline">Customize Columns</span>
            <span className="lg:hidden">Columns</span>
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {modes.map((column) => {
              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              );
            })}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" size="sm">
        <PlusIcon />
        <span className="hidden lg:inline">Add Section</span>
      </Button>
    </div>
  );
}
