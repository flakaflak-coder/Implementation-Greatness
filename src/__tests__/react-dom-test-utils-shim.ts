// Shim for react-dom/test-utils which was removed in React 19
// @testing-library/react uses this internally
import { act as reactAct } from 'react'

export const act = reactAct
