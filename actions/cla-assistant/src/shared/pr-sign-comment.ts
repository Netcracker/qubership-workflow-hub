import * as input from './getInputs.js'

export function getPrSignComment() {
  return input.getCustomPrSignComment() || "I have read the CLA Document and I hereby sign the CLA"
}
