export const abi = [
  {
    type: "function",
    name: "createPoll",
    inputs: [
      { name: "question_", type: "string" },
      { name: "options_", type: "string[]" },
      { name: "duration_", type: "uint256" },
    ],
    outputs: [{ name: "pollId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "vote",
    inputs: [
      { name: "pollId_", type: "uint256" },
      { name: "optionIndex_", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getOptions",
    inputs: [{ name: "pollId_", type: "uint256" }],
    outputs: [{ name: "", type: "string[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getResults",
    inputs: [{ name: "pollId_", type: "uint256" }],
    outputs: [{ name: "results", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "polls",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "question", type: "string" },
      { name: "deadline", type: "uint256" },
      { name: "creator", type: "address" },
      { name: "exists", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasVoted",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isActive",
    inputs: [{ name: "pollId_", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextPollId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "PollCreated",
    inputs: [
      { name: "pollId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "question", type: "string", indexed: false },
      { name: "deadline", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Voted",
    inputs: [
      { name: "pollId", type: "uint256", indexed: true },
      { name: "voter", type: "address", indexed: true },
      { name: "optionIndex", type: "uint256", indexed: false },
    ],
  },
] as const;
