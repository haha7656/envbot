-- ===== HARD SANDBOX =====
os.execute = nil
os.remove = nil
os.rename = nil
os.exit = nil
os.getenv = nil
io.popen = nil
package.loadlib = nil
package.searchpath = nil

-- restrict file access
local old_open = io.open
io.open = function(path, mode)
    if not tostring(path):match("^sandbox/") then
        error("File access denied: " .. tostring(path))
    end
    return old_open(path, mode)
end

-- ===== LOAD ENV LOGGER =====
dofile("lua/envlogger.lua")

-- ===== LOAD USER SCRIPT =====
local f = io.open("sandbox/input.lua", "r")
if not f then
    error("No input.lua provided")
end

local src = f:read("*a")
f:close()

local fn, err = loadstring(src)
if not fn then
    print("LOAD ERROR:", err)
    return
end

xpcall(fn, function(e)
    print("RUNTIME ERROR:", e)
end)
