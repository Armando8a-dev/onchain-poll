// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title OnChainPoll
/// @notice Create polls with multiple options, a voting deadline, and one vote per address.
contract OnChainPoll {

    // ─────────────────────────────────────────
    // TYPES
    // ─────────────────────────────────────────

    struct Poll {
        string question;
        string[] options;       // dynamic: creator sets how many options
        uint256 deadline;       // block.timestamp after which no more votes
        address creator;
        bool exists;
    }

    // ─────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────

    uint256 public nextPollId;

    mapping(uint256 => Poll) public polls;
    // pollId => optionIndex => vote count
    mapping(uint256 => mapping(uint256 => uint256)) public voteCounts;
    // pollId => voter address => has voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // ─────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────

    event PollCreated(uint256 indexed pollId, address indexed creator, string question, uint256 deadline);
    event Voted(uint256 indexed pollId, address indexed voter, uint256 optionIndex);

    // ─────────────────────────────────────────
    // FUNCTIONS
    // ─────────────────────────────────────────

    /// @notice Create a new poll.
    /// @param question_  The question being asked.
    /// @param options_   Array of answer options (min 2, max 10).
    /// @param duration_  Voting window in seconds from now.
    function createPoll(
        string calldata question_,
        string[] calldata options_,
        uint256 duration_
    ) external returns (uint256 pollId) {
        require(options_.length >= 2, "Need at least 2 options");
        require(options_.length <= 10, "Max 10 options");
        require(duration_ > 0, "Duration must be positive");

        pollId = nextPollId++;

        polls[pollId] = Poll({
            question: question_,
            options: options_,
            deadline: block.timestamp + duration_,
            creator: msg.sender,
            exists: true
        });

        emit PollCreated(pollId, msg.sender, question_, block.timestamp + duration_);
    }

    /// @notice Cast a vote on an existing poll.
    /// @param pollId_      The ID of the poll.
    /// @param optionIndex_ Zero-based index of the chosen option.
    function vote(uint256 pollId_, uint256 optionIndex_) external {
        Poll storage poll = polls[pollId_];

        require(poll.exists, "Poll does not exist");
        require(block.timestamp < poll.deadline, "Poll has ended");
        require(!hasVoted[pollId_][msg.sender], "Already voted");
        require(optionIndex_ < poll.options.length, "Invalid option");

        hasVoted[pollId_][msg.sender] = true;
        voteCounts[pollId_][optionIndex_]++;

        emit Voted(pollId_, msg.sender, optionIndex_);
    }

    // ─────────────────────────────────────────
    // VIEW FUNCTIONS (free to read, no gas)
    // ─────────────────────────────────────────

    /// @notice Get all vote counts for every option of a poll.
    function getResults(uint256 pollId_) external view returns (uint256[] memory results) {
        Poll storage poll = polls[pollId_];
        require(poll.exists, "Poll does not exist");

        results = new uint256[](poll.options.length);
        for (uint256 i = 0; i < poll.options.length; i++) {
            results[i] = voteCounts[pollId_][i];
        }
    }

    /// @notice Get the options array of a poll.
    function getOptions(uint256 pollId_) external view returns (string[] memory) {
        require(polls[pollId_].exists, "Poll does not exist");
        return polls[pollId_].options;
    }

    /// @notice True if the voting window is still open.
    function isActive(uint256 pollId_) external view returns (bool) {
        require(polls[pollId_].exists, "Poll does not exist");
        return block.timestamp < polls[pollId_].deadline;
    }
}
