import fetch from "node-fetch";

const BASE_URL = "http://localhost:8000";

// Mock Data
const userA = {
  name: "Jay",
  email: "jay@test.com",
  password: "password123",
};

const userB = {
  name: "Siddhi",
  email: "siddhi@test.com",
  password: "password123",
};

let tokenA = "";
let tokenB = "";

async function runTest() {
  console.log("🚀 Starting Backend Tests...\n");

  // 1. Register User A
  console.log("1. Registering User A...");
  let res = await fetch(`${BASE_URL}/user/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userA),
  });
  let data = await res.json();
  console.log("   Response:", data.message || data);

  // 2. Register User B
  console.log("\n2. Registering User B...");
  res = await fetch(`${BASE_URL}/user/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userB),
  });
  data = await res.json();
  console.log("   Response:", data.message || data);

  // 3. Login User A
  console.log("\n3. Logging in User A...");
  res = await fetch(`${BASE_URL}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: userA.email, password: userA.password }),
  });
  data = await res.json();
  tokenA = data.token;
  console.log("   Token A received.");

  // 4. Login User B
  console.log("\n4. Logging in User B...");
  res = await fetch(`${BASE_URL}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: userB.email, password: userB.password }),
  });
  data = await res.json();
  tokenB = data.token;
  console.log("   Token B received.");

  // 5. User A links User B
  console.log("\n5. User A linking User B as partner...");
  res = await fetch(`${BASE_URL}/user/link-partner`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ email: userB.email }),
  });
  data = await res.json();
  console.log("   Response:", data.message);

  // 6. User A creates a task
  console.log("\n6. User A creating a task...");
  res = await fetch(`${BASE_URL}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      content: "Complete Backend Testing",
      category: "Work",
    }),
  });
  data = await res.json();
  console.log("   Response:", data.message);

  // 7. User B checks Dashboard
  console.log("\n7. User B checking Dashboard (Should see A's task)...");
  res = await fetch(`${BASE_URL}/tasks/dashboard`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokenB}`,
    },
  });
  data = await res.json();
  if (data.data.partnerTasks.length > 0) {
    console.log("   SUCCESS: Partner tasks found!");
    console.log("   Partner Task:", data.data.partnerTasks[0].content);
  } else {
    console.log("   FAILURE: No partner tasks found.");
  }
}

runTest();
