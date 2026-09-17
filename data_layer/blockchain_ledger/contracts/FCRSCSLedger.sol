// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract FCRSCSLedger {
    struct Record {
        bytes32[] documentHashes;
        uint256 publishedAt;
        bool isVoided;
        string voidReason;
        uint256 voidedAt;
    }

    address public owner;
    mapping(string => Record) private records;

    event RecordPublished(string indexed caseId, bytes32[] documentHashes, uint256 timestamp);
    event RecordVoided(string indexed caseId, string reason, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorised");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function publishRecord(string calldata caseId, bytes32[] calldata documentHashes) external onlyOwner {
        require(records[caseId].publishedAt == 0, "Record already exists");
        require(documentHashes.length > 0, "Invalid hash");
        for (uint256 i = 0; i < documentHashes.length; i++) {
            require(documentHashes[i] != bytes32(0), "Invalid hash");
        }
        Record storage r = records[caseId];
        r.documentHashes = documentHashes;
        r.publishedAt = block.timestamp;
        emit RecordPublished(caseId, documentHashes, block.timestamp);
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
        bytes32[] memory documentHashes,
        uint256 publishedAt,
        bool isVoided,
        string memory voidReason,
        uint256 voidedAt
    ) {
        Record storage r = records[caseId];
        return (r.documentHashes, r.publishedAt, r.isVoided, r.voidReason, r.voidedAt);
    }
}