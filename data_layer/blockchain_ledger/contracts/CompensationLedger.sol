// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CompensationLedger {
    struct Record {
        bytes32 documentHash;
        uint256 publishedAt;
        bool isVoided;
        string voidReason;
        uint256 voidedAt;
    }

    address public owner;
    mapping(string => Record) private records;

    event RecordPublished(string indexed caseId, bytes32 documentHash, uint256 timestamp);
    event RecordVoided(string indexed caseId, string reason, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorised");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function publishRecord(string calldata caseId, bytes32 documentHash) external onlyOwner {
        require(records[caseId].publishedAt == 0, "Record already exists");
        require(documentHash != bytes32(0), "Invalid hash");
        records[caseId] = Record(documentHash, block.timestamp, false, "", 0);
        emit RecordPublished(caseId, documentHash, block.timestamp);
    }

    function voidRecord(string calldata caseId, string calldata reason) external onlyOwner {
        require(records[caseId].publishedAt != 0, "Record does not exist");
        require(!records[caseId].isVoided, "Record already voided");
        require(bytes(reason).length > 0, "Reason required");
        records[caseId].isVoided = true;
        records[caseId].voidReason = reason;
        records[caseId].voidedAt = block.timestamp;
        emit RecordVoided(caseId, reason, block.timestamp);
    }

    function getRecord(string calldata caseId) external view returns (
        bytes32 documentHash,
        uint256 publishedAt,
        bool isVoided,
        string memory voidReason,
        uint256 voidedAt
    ) {
        Record storage r = records[caseId];
        return (r.documentHash, r.publishedAt, r.isVoided, r.voidReason, r.voidedAt);
    }
}
