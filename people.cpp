// people.cpp
#include <vector>
#include <emscripten/emscripten.h>
#include <algorithm> // For std::remove_if

extern "C" {

struct Person {
    double lat;
    double lon;
};

std::vector<Person> g_people;
bool g_user_exists = false;

// --- EXPORTED FUNCTIONS ---

// Sets or updates the user's location. The user is always at index 0.
EMSCRIPTEN_KEEPALIVE
void setUserLocation(double lat, double lon) {
    if (g_user_exists) {
        // If user already exists, just update their position
        g_people[0] = {lat, lon};
    } else {
        // If user doesn't exist, insert them at the front of the vector
        g_people.insert(g_people.begin(), {lat, lon});
        g_user_exists = true;
    }
}

// Adds a new "other" person to our vector.
EMSCRIPTEN_KEEPALIVE
void addOtherPerson(double lat, double lon) {
    g_people.push_back({lat, lon});
}

// Returns true if the user's marker has been set.
EMSCRIPTEN_KEEPALIVE
bool userExists() {
    return g_user_exists;
}

// Returns the total number of people.
EMSCRIPTEN_KEEPALIVE
int getPeopleCount() {
    return g_people.size();
}

// Returns a pointer to the raw data of our people vector.
EMSCRIPTEN_KEEPALIVE
Person* getPeopleData() {
    return g_people.data();
}

// Update positions, but SKIP the user (at index 0)
EMSCRIPTEN_KEEPALIVE
void updatePositions() {
    // Start the loop at 1 if the user exists, otherwise start at 0.
    size_t start_index = g_user_exists ? 1 : 0;
    for (size_t i = start_index; i < g_people.size(); ++i) {
        g_people[i].lat += (rand() % 100 - 50) / 10000.0;
        g_people[i].lon += (rand() % 100 - 50) / 10000.0;
    }
}

} // extern "C"