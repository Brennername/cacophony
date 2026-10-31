import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GoSignatureHarvester } from "../signature/GoSignatureHarvester.js";

describe("GoSignatureHarvester", () => {
  const harvester = new GoSignatureHarvester();

  describe("Struct Declarations", () => {
    test("should harvest Go struct definitions with fields and types", () => {
      const code = `
        package config

        type DatabaseConfig struct {
          Host string
          Port int
          Username string
          Password string
        }
      `;

      const records = harvester.harvest("pkg/config/database.go", code);
      assert.equal(records.length, 1);
      const structRecord = records[0]!;
      assert.equal(structRecord.id, "pkg/config/database.go#DatabaseConfig");
      assert.equal(structRecord.identifier, "DatabaseConfig");
      assert.equal(structRecord.kind, "type");
      assert.equal(structRecord.language, "go");
      assert.equal(structRecord.properties.length, 4);

      const hostProp = structRecord.properties.find((p) => p.name === "Host");
      assert.ok(hostProp);
      assert.equal(hostProp.type, "string");

      const portProp = structRecord.properties.find((p) => p.name === "Port");
      assert.ok(portProp);
      assert.equal(portProp.type, "int");

      assert.ok(structRecord.rawCompressed.includes("type DatabaseConfig struct"));
      assert.ok(structRecord.rawCompressed.includes("Host string"));
    });
  });

  describe("Interface Definitions", () => {
    test("should harvest Go interface methods with parameters and return types", () => {
      const code = `
        package service

        type QueueService interface {
          Enqueue(jobId string, payload string) error
          Dequeue() (Job, error)
          Close()
        }
      `;

      const records = harvester.harvest("pkg/service/queue.go", code);
      assert.equal(records.length, 1);
      const ifaceRecord = records[0]!;
      assert.equal(ifaceRecord.identifier, "QueueService");
      assert.equal(ifaceRecord.kind, "interface");
      assert.equal(ifaceRecord.callables.length, 3);

      const enqueueMethod = ifaceRecord.callables.find((c) => c.name === "Enqueue");
      assert.ok(enqueueMethod);
      assert.equal(enqueueMethod.returnType, "error");
      assert.equal(enqueueMethod.parameters.length, 2);
      assert.equal(enqueueMethod.parameters[0]?.name, "jobId");
      assert.equal(enqueueMethod.parameters[0]?.type, "string");
      assert.equal(enqueueMethod.parameters[1]?.name, "payload");
      assert.equal(enqueueMethod.parameters[1]?.type, "string");

      const dequeueMethod = ifaceRecord.callables.find((c) => c.name === "Dequeue");
      assert.ok(dequeueMethod);
      assert.equal(dequeueMethod.returnType, "(Job, error)");
      assert.equal(dequeueMethod.parameters.length, 0);

      const closeMethod = ifaceRecord.callables.find((c) => c.name === "Close");
      assert.ok(closeMethod);
      assert.equal(closeMethod.returnType, "void");
    });
  });

  describe("Functions and Receiver Methods", () => {
    test("should harvest standalone package-level functions", () => {
      const code = `
        package utils

        func HashPassword(plain string, salt string) string {
          return plain + salt
        }

        func GenerateUUID() string {
          return "uuid"
        }
      `;

      const records = harvester.harvest("pkg/utils/crypto.go", code);
      assert.equal(records.length, 2);

      const hashFn = records.find((r) => r.identifier === "HashPassword");
      assert.ok(hashFn);
      assert.equal(hashFn.kind, "function");
      assert.equal(hashFn.callables.length, 1);
      assert.equal(hashFn.callables[0]?.name, "HashPassword");
      assert.equal(hashFn.callables[0]?.returnType, "string");
      assert.equal(hashFn.callables[0]?.parameters.length, 2);
      assert.equal(hashFn.callables[0]?.parameters[0]?.name, "plain");
      assert.equal(hashFn.callables[0]?.parameters[0]?.type, "string");
      assert.equal(hashFn.callables[0]?.parameters[1]?.name, "salt");
      assert.equal(hashFn.callables[0]?.parameters[1]?.type, "string");
    });

    test("should harvest struct receiver methods with receiver notation", () => {
      const code = `
        package server

        func (s *HttpServer) Start(port int) error {
          return nil
        }
      `;

      const records = harvester.harvest("pkg/server/http.go", code);
      assert.equal(records.length, 1);
      const methodRecord = records[0]!;
      assert.equal(methodRecord.identifier, "Start");
      assert.equal(methodRecord.callables.length, 1);
      assert.equal(methodRecord.callables[0]?.name, "s *HttpServer.Start");
      assert.equal(methodRecord.callables[0]?.returnType, "error");
      assert.equal(methodRecord.callables[0]?.parameters.length, 1);
      assert.equal(methodRecord.callables[0]?.parameters[0]?.name, "port");
      assert.equal(methodRecord.callables[0]?.parameters[0]?.type, "int");
    });
  });
});
