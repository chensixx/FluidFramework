import { Router } from "express";
import { Provider } from "nconf";
import { defaultPartials } from "./partials";

export function create(config: Provider): Router {
    const router: Router = Router();

    /**
     * Route to retrieve the home page for the app
     */
    router.get("/", (request, response, next) => {
        response.render("home", { partials: defaultPartials, title: "Routerlicious" });
    });

    return router;
}
