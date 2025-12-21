import yaml from 'js-yaml';

export function generateTrueNASValues(composeContent: string): string {
  try {
    const compose: any = yaml.load(composeContent);
    if (!compose || !compose.services) return "# No services found";

    const serviceNames = Object.keys(compose.services);
    if (serviceNames.length === 0) return "# No services found";

    // TrueNAS apps usually focus on one main service. We'll pick the first one.
    const mainServiceName = serviceNames[0];
    const service = compose.services[mainServiceName];

    const [repo, tag] = (service.image || "").split(':');

    const truenas: any = {
      image: {
        repository: repo || "image",
        tag: tag || "latest",
        pullPolicy: "IfNotPresent"
      },
      service: {
        main: {
          ports: {
            main: {
              port: 10000, // Default placeholder, will be updated below
              targetPort: 80,
              protocol: "TCP"
            }
          }
        }
      },
      workload: {
        main: {
          podSpec: {
            containers: {
              main: {
                env: {}
              }
            }
          }
        }
      },
      persistence: {}
    };

    // Ports
    if (service.ports && service.ports.length > 0) {
      const firstPort = service.ports[0];
      // Handle "8080:80" string
      const parts = typeof firstPort === 'string' ? firstPort.split(':') : [];
      if (parts.length >= 2) {
        truenas.service.main.ports.main.port = parseInt(parts[0], 10);
        truenas.service.main.ports.main.targetPort = parseInt(parts[1], 10);
      }
    }

    // Environment
    if (service.environment) {
      if (Array.isArray(service.environment)) {
        service.environment.forEach((env: string) => {
          const [key, val] = env.split('=');
          truenas.workload.main.podSpec.containers.main.env[key] = val || "";
        });
      } else {
        truenas.workload.main.podSpec.containers.main.env = { ...service.environment };
      }
    }

    // Volumes
    if (service.volumes && Array.isArray(service.volumes)) {
      service.volumes.forEach((vol: string | any, idx: number) => {
        const volStr = typeof vol === 'string' ? vol : "";
        if (volStr) {
          const [host, container] = volStr.split(':');
          if (host && container) {
             const name = `vol${idx}`;
             const isNamed = !host.startsWith('/') && !host.startsWith('.') && !host.startsWith('~');
             
             if (isNamed) {
                 truenas.persistence[name] = {
                   enabled: true,
                   type: "ixVolume",
                   datasetName: host,
                   mountPath: container
                 };
             } else {
                 truenas.persistence[name] = {
                   enabled: true,
                   type: "hostPath",
                   hostPath: host,
                   mountPath: container
                 };
             }
          }
        }
      });
    }

    return yaml.dump(truenas);
  } catch (e) {
    console.error("TrueNAS generation error", e);
    return "# Error generating TrueNAS template";
  }
}