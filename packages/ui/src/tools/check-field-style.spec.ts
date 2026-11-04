import { describe, expect, it } from "vitest";
import { findPlainLabelFields } from "./check-field-style.mjs";

const plain = `<FormField v-slot="{ componentField }" name="email">
  <FormItem><FormLabel>Email</FormLabel><FormControl><Input v-bind="componentField" /></FormControl><FormMessage /></FormItem>
</FormField>`;

describe("findPlainLabelFields", () => {
  it("flags a text control with a FormLabel", () => {
    expect(findPlainLabelFields(plain)).toEqual([{ line: 1, name: "email" }]);
  });

  it("flags select and textarea fields", () => {
    expect(
      findPlainLabelFields(plain.replace("<Input", "<Select")),
    ).toHaveLength(1);
    expect(
      findPlainLabelFields(plain.replace("<Input", "<Textarea")),
    ).toHaveLength(1);
  });

  it("ignores checkbox, switch and radio fields", () => {
    expect(
      findPlainLabelFields(plain.replace("<Input", "<Checkbox")),
    ).toHaveLength(0);
    expect(
      findPlainLabelFields(plain.replace("<Input", "<Switch")),
    ).toHaveLength(0);
  });

  it("ignores FloatingField", () => {
    const floating = `<FloatingField name="x" label="X"><FormControl><Input /></FormControl></FloatingField>`;
    expect(findPlainLabelFields(floating)).toHaveLength(0);
  });

  it("reports the line of the second field", () => {
    expect(findPlainLabelFields(`<p/>\n${plain}`)).toEqual([
      { line: 2, name: "email" },
    ]);
  });
});
